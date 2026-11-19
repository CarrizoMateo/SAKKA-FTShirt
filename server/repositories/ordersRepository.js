// Pedidos, productos del pedido e historial de eventos.
const crypto = require("crypto");
const { query } = require("../db/pool");

// Sin letras ni números que se confunden (I, L, O, 0, 1).
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_PATTERN = /^SAKKA-[A-HJKMNP-Z2-9]{6}$/;

function generateTrackingCode() {
  let suffix = "";

  for (let i = 0; i < 6; i += 1) {
    suffix += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  }

  return `SAKKA-${suffix}`;
}

// Acepta "sakka-7k4q9x", "7K4Q9X", con espacios, etc. Devuelve null si no es válido.
function normalizeTrackingCode(input) {
  let code = String(input ?? "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .trim();

  if (/^[A-Z0-9]{6}$/.test(code)) code = `SAKKA-${code}`;

  return CODE_PATTERN.test(code) ? code : null;
}

const runner = (client) => (client ? client.query.bind(client) : query);

async function saveOrder(order, client) {
  const run = runner(client);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const { rows } = await run(
        `INSERT INTO orders (
           external_reference, tracking_code, provider_order_id, provider_payment_id,
           customer_name, customer_phone, customer_email,
           total_amount, currency, payment_status,
           shipping_zone_id, shipping_zone_name, shipping_amount, shipping_address
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)
         RETURNING id, tracking_code`,
        [
          order.external_reference,
          generateTrackingCode(),
          order.provider_order_id ?? null,
          order.provider_payment_id ?? null,
          order.customer_name ?? null,
          order.customer_phone ?? null,
          order.customer_email ?? null,
          order.total_amount,
          order.currency ?? "ARS",
          order.payment_status ?? "pending",
          order.shipping_zone_id ?? null,
          order.shipping_zone_name ?? null,
          order.shipping_amount ?? 0,
          order.shipping_address == null
            ? null
            : JSON.stringify(order.shipping_address),
        ],
      );

      return rows[0];
    } catch (error) {
      // Código repetido (muy improbable): se genera otro y se reintenta.
      if (error.code === "23505" && /tracking_code/.test(error.constraint || "")) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("No se pudo generar un código de seguimiento único.");
}

async function findOrderByReference(reference) {
  const { rows } = await query(
    `SELECT * FROM orders WHERE external_reference = $1`,
    [reference],
  );
  return rows[0] ?? null;
}

async function findOrderByCode(code) {
  const { rows } = await query(
    `SELECT * FROM orders WHERE tracking_code = $1`,
    [code],
  );
  return rows[0] ?? null;
}

async function getOrderItems(orderId) {
  const { rows } = await query(
    `SELECT product_id, product_name, size, quantity, unit_price, subtotal
     FROM order_items WHERE order_id = $1 ORDER BY id`,
    [orderId],
  );
  return rows;
}

// Guarda los productos del pedido. Si el pedido ya los tiene, deben ser los mismos.
async function saveOrderItems(orderId, items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("El pedido debe tener al menos un producto.");
  }

  const existing = await getOrderItems(orderId);

  if (existing.length > 0) {
    const key = (id, size, quantity, price) => `${id}|${size}|${quantity}|${price}`;
    const stored = existing
      .map((i) => key(i.product_id, i.size, i.quantity, i.unit_price))
      .sort()
      .join(";");
    const incoming = items
      .map((i) => key(i.id, i.size, i.quantity, i.price))
      .sort()
      .join(";");

    if (stored !== incoming) {
      throw new Error("Los productos no coinciden con los ya guardados en el pedido.");
    }
    return;
  }

  for (const item of items) {
    await query(
      `INSERT INTO order_items
         (order_id, product_id, product_name, size, quantity, unit_price, subtotal)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [orderId, item.id, item.name, item.size, item.quantity, item.price, item.price * item.quantity],
    );
  }
}

// Cambia el estado del pago. Un pago aprobado solo puede pasar a "refunded".
// Devuelve el pedido actualizado, o null si no hubo cambios.
async function updatePaymentStatus(status, reference) {
  const { rows } = await query(
    `UPDATE orders
     SET payment_status = $1, updated_at = now()
     WHERE external_reference = $2
       AND payment_status <> $1
       AND (payment_status <> 'approved' OR $1 = 'refunded')
     RETURNING *`,
    [status, reference],
  );
  return rows[0] ?? null;
}

async function linkProviderOrder(providerId, reference) {
  await query(
    `UPDATE orders SET provider_order_id = $1, updated_at = now()
     WHERE external_reference = $2`,
    [providerId, reference],
  );
}

async function updateProviderPayment(paymentId, reference) {
  await query(
    `UPDATE orders SET provider_payment_id = $1, updated_at = now()
     WHERE external_reference = $2`,
    [paymentId, reference],
  );
}

async function addEvent(client, orderId, kind, status, note) {
  await runner(client)(
    `INSERT INTO order_events (order_id, kind, status, note)
     VALUES ($1, $2, $3, $4)`,
    [orderId, kind, status ?? null, note ?? null],
  );
}

// ---- Mail de confirmación: un solo envío por pedido ----
async function claimConfirmationEmail(reference) {
  const result = await query(
    `UPDATE orders
     SET confirmation_email_status = 'sending',
         confirmation_email_error = NULL,
         updated_at = now()
     WHERE external_reference = $1
       AND payment_status = 'approved'
       AND customer_email IS NOT NULL AND customer_email <> ''
       AND (
         confirmation_email_status IN ('pending','error')
         OR (confirmation_email_status = 'sending'
             AND updated_at < now() - interval '15 minutes')
       )`,
    [reference],
  );
  return result.rowCount === 1;
}

async function markConfirmationEmailSent(reference) {
  await query(
    `UPDATE orders
     SET confirmation_email_status = 'sent',
         confirmation_email_sent_at = now(),
         confirmation_email_error = NULL,
         updated_at = now()
     WHERE external_reference = $1`,
    [reference],
  );
}

async function markConfirmationEmailError(message, reference) {
  await query(
    `UPDATE orders
     SET confirmation_email_status = 'error',
         confirmation_email_error = $1,
         updated_at = now()
     WHERE external_reference = $2 AND confirmation_email_status = 'sending'`,
    [String(message).slice(0, 500), reference],
  );
}

async function resetConfirmationEmail(code) {
  const result = await query(
    `UPDATE orders
     SET confirmation_email_status = 'pending', confirmation_email_error = NULL
     WHERE tracking_code = $1 AND payment_status = 'approved'`,
    [code],
  );
  return result.rowCount === 1;
}

// ---- Consultas para el panel ----
async function listOrders(limit = 500) {
  const { rows } = await query(
    `SELECT o.*,
       COALESCE((
         SELECT json_agg(json_build_object(
           'product_id', oi.product_id, 'product_name', oi.product_name,
           'size', oi.size, 'quantity', oi.quantity,
           'unit_price', oi.unit_price, 'subtotal', oi.subtotal
         ) ORDER BY oi.id)
         FROM order_items oi WHERE oi.order_id = o.id
       ), '[]'::json) AS items,
       COALESCE((
         SELECT json_agg(json_build_object(
           'kind', e.kind, 'status', e.status, 'note', e.note, 'at', e.created_at
         ) ORDER BY e.id)
         FROM order_events e WHERE e.order_id = o.id
       ), '[]'::json) AS events
     FROM orders o
     ORDER BY o.id DESC
     LIMIT $1`,
    [limit],
  );
  return rows;
}

async function getStats() {
  const { rows } = await query(`
    SELECT
      COUNT(*)::int AS total_orders,
      COUNT(*) FILTER (WHERE payment_status = 'approved')::int AS approved_orders,
      COUNT(*) FILTER (WHERE payment_status = 'pending')::int AS pending_orders,
      COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'approved'), 0)::int AS approved_revenue,
      COUNT(*) FILTER (
        WHERE payment_status = 'approved' AND shipping_status IN ('pending','preparing')
      )::int AS to_ship
    FROM orders
  `);
  return rows[0];
}

// Camisetas que hay que preparar: pedidos pagados que todavía no se despacharon.
async function getProductionSummary() {
  const { rows } = await query(`
    SELECT oi.product_id, oi.product_name, oi.size, SUM(oi.quantity)::int AS quantity
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.payment_status = 'approved'
      AND o.shipping_status IN ('pending','preparing')
    GROUP BY oi.product_id, oi.product_name, oi.size
    ORDER BY oi.product_name, oi.size
  `);
  return rows;
}

// Datos públicos de seguimiento: nunca incluye nombre, mail ni dirección.
async function getTracking(code) {
  const order = await findOrderByCode(code);
  if (!order) return null;

  const [items, events] = await Promise.all([
    getOrderItems(order.id),
    query(
      `SELECT kind, status, note, created_at AS at
       FROM order_events
       WHERE order_id = $1 AND kind IN ('payment','shipping')
       ORDER BY id`,
      [order.id],
    ),
  ]);

  return {
    code: order.tracking_code,
    paymentStatus: order.payment_status,
    shippingStatus: order.shipping_status,
    trackingNumber: order.tracking_number,
    note: order.shipping_note,
    zone: order.shipping_zone_name,
    createdAt: order.created_at,
    updatedAt: order.shipping_updated_at || order.updated_at,
    items: items.map((i) => ({ name: i.product_name, size: i.size, quantity: i.quantity })),
    events: events.rows,
  };
}

module.exports = {
  generateTrackingCode,
  normalizeTrackingCode,
  saveOrder,
  findOrderByReference,
  findOrderByCode,
  getOrderItems,
  saveOrderItems,
  updatePaymentStatus,
  linkProviderOrder,
  updateProviderPayment,
  addEvent,
  claimConfirmationEmail,
  markConfirmationEmailSent,
  markConfirmationEmailError,
  resetConfirmationEmail,
  listOrders,
  getStats,
  getProductionSummary,
  getTracking,
};
