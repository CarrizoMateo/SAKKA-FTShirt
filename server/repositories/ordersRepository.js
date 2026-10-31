const { pool, query } = require("../db/database");

function serializeAddress(value) {
  if (value == null) return null;
  return typeof value === "string" ? value : JSON.stringify(value);
}

async function saveOrder(order) {
  const address = serializeAddress(order.shipping_address);
  const result = await query(
    `
      INSERT INTO orders (
        external_reference, provider_order_id, provider_payment_id,
        customer_email, total_amount, currency, payment_status,
        shipping_zone_id, shipping_zone_name, shipping_amount, shipping_address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (external_reference) DO NOTHING
      RETURNING id
    `,
    [
      order.external_reference,
      order.provider_order_id ?? null,
      order.provider_payment_id ?? null,
      order.customer_email ?? null,
      order.total_amount,
      order.currency ?? "ARS",
      order.payment_status ?? "pending",
      order.shipping_zone_id ?? null,
      order.shipping_zone_name ?? null,
      order.shipping_amount ?? 0,
      address,
    ],
  );

  if (result.rows[0]) return result.rows[0];

  const existing = await query(
    "SELECT id FROM orders WHERE external_reference = $1",
    [order.external_reference],
  );
  return existing.rows[0] ?? null;
}

async function findOrderByReference(reference) {
  const result = await query(
    "SELECT * FROM orders WHERE external_reference = $1",
    [reference],
  );
  return result.rows[0] ?? null;
}

async function findOrderByProviderId(providerId) {
  const result = await query(
    "SELECT * FROM orders WHERE provider_order_id = $1",
    [String(providerId)],
  );
  return result.rows[0] ?? null;
}

async function saveOrderItems(externalReference, items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("El pedido debe tener al menos un producto.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      "SELECT id FROM orders WHERE external_reference = $1 FOR UPDATE",
      [externalReference],
    );
    const order = orderResult.rows[0];

    if (!order) {
      throw new Error("No existe el pedido para guardar sus productos.");
    }

    const existingResult = await client.query(
      `
        SELECT product_id, product_name, quantity, unit_price, subtotal, size
        FROM order_items
        WHERE order_id = $1
        ORDER BY product_id, COALESCE(size, '')
      `,
      [order.id],
    );

    const normalize = (list) =>
      list
        .map((item) => ({
          id: String(item.product_id ?? item.id),
          name: item.product_name ?? item.name,
          quantity: Number(item.quantity),
          price: Number(item.unit_price ?? item.price),
          size: String(item.size ?? item.talle ?? "").trim() || null,
        }))
        .sort(
          (a, b) =>
            a.id.localeCompare(b.id) ||
            String(a.size ?? "").localeCompare(String(b.size ?? "")),
        );

    const existingItems = existingResult.rows;
    if (existingItems.length > 0) {
      const existing = normalize(existingItems);
      const incoming = normalize(items);
      const sameItems =
        existing.length === incoming.length &&
        existing.every((item, index) => {
          const next = incoming[index];
          return (
            item.id === next.id &&
            item.name === next.name &&
            item.quantity === next.quantity &&
            item.price === next.price &&
            item.size === next.size
          );
        });

      if (!sameItems) {
        throw new Error(
          "Los productos no coinciden con los ya guardados en el pedido.",
        );
      }

      await client.query("COMMIT");
      return;
    }

    for (const item of items) {
      const quantity = Number(item.quantity);
      const price = Number(item.unit_price ?? item.price);
      await client.query(
        `
          INSERT INTO order_items (
            order_id, product_id, product_name, quantity, unit_price, subtotal, size
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          order.id,
          String(item.id ?? item.product_id),
          item.product_name ?? item.name,
          quantity,
          price,
          price * quantity,
          item.size ?? item.talle ?? null,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function getOrderItemsByReference(reference) {
  const result = await query(
    `
      SELECT oi.product_id, oi.product_name, oi.quantity,
             oi.unit_price, oi.subtotal, oi.size
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      WHERE o.external_reference = $1
      ORDER BY oi.id
    `,
    [reference],
  );
  return result.rows;
}

async function claimEmail(reference) {
  const result = await query(
    `
      UPDATE orders
      SET confirmation_email_status = 'sending',
          confirmation_email_error = NULL,
          updated_at = NOW()
      WHERE external_reference = $1
        AND payment_status = 'approved'
        AND customer_email IS NOT NULL
        AND customer_email <> ''
        AND (
          confirmation_email_status IN ('pending', 'error')
          OR (
            confirmation_email_status = 'sending'
            AND updated_at < NOW() - INTERVAL '15 minutes'
          )
        )
      RETURNING id
    `,
    [reference],
  );
  return result.rowCount === 1;
}

async function markEmailSent(reference) {
  return query(
    `
      UPDATE orders
      SET confirmation_email_status = 'sent',
          confirmation_email_sent_at = NOW(),
          confirmation_email_error = NULL,
          updated_at = NOW()
      WHERE external_reference = $1
    `,
    [reference],
  );
}

async function markEmailError(message, reference) {
  return query(
    `
      UPDATE orders
      SET confirmation_email_status = 'error',
          confirmation_email_error = $1,
          updated_at = NOW()
      WHERE external_reference = $2
        AND confirmation_email_status = 'sending'
    `,
    [String(message).slice(0, 500), reference],
  );
}

async function updatePaymentStatus(status, reference) {
  return query(
    `
      UPDATE orders
      SET payment_status = $1, updated_at = NOW()
      WHERE external_reference = $2
        AND (payment_status <> 'approved' OR $1 = 'refunded')
    `,
    [status, reference],
  );
}

async function linkProviderOrder(providerId, reference) {
  return query(
    `
      UPDATE orders
      SET provider_order_id = $1, updated_at = NOW()
      WHERE external_reference = $2
    `,
    [String(providerId), reference],
  );
}

async function updateProviderPayment(paymentId, reference) {
  return query(
    `
      UPDATE orders
      SET provider_payment_id = $1, updated_at = NOW()
      WHERE external_reference = $2
    `,
    [String(paymentId), reference],
  );
}

module.exports = {
  saveOrder,
  saveOrderItems,
  findOrderByReference,
  findOrderByProviderId,
  getOrderItemsByReference,
  claimEmail,
  markEmailSent,
  markEmailError,
  updatePaymentStatus,
  linkProviderOrder,
  updateProviderPayment,
};
