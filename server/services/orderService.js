// Reglas de negocio de los pedidos: pagos, stock y envío.
const { tx } = require("../db/pool");
const orders = require("../repositories/ordersRepository");
const stock = require("../repositories/stockRepository");
const { sendOrderConfirmation, sendShippingUpdate } = require("./emailService");

const SHIPPING_STATUSES = ["pending", "preparing", "shipped", "delivered", "cancelled"];

// Envía el mail de pago confirmado, una sola vez por pedido.
async function sendApprovedOrderEmail(reference) {
  const order = await orders.findOrderByReference(reference);

  if (!order || order.payment_status !== "approved") return;

  if (!order.customer_email) {
    console.warn("Pedido sin email de cliente:", order.tracking_code);
    return;
  }

  if (!(await orders.claimConfirmationEmail(reference))) return;

  try {
    const items = await orders.getOrderItems(order.id);
    await sendOrderConfirmation({ to: order.customer_email, order, items });
    await orders.markConfirmationEmailSent(reference);
    console.log("Mail de confirmación enviado:", order.tracking_code);
  } catch (error) {
    await orders.markConfirmationEmailError(error.message, reference);
    console.error("No se pudo enviar el mail de confirmación:", error.message);
  }
}

// Aplica un estado de pago informado por Mercado Pago (respuesta directa o webhook).
// Es idempotente: se puede llamar varias veces con el mismo estado.
async function applyPaymentStatus(reference, newStatus) {
  const changed = await orders.updatePaymentStatus(newStatus, reference);

  if (changed) {
    await orders.addEvent(null, changed.id, "payment", newStatus, null);
  }

  if (newStatus === "approved") {
    // Se reintenta aunque el estado no haya cambiado: sirve si antes faltó stock.
    const result = await stock.deductOrderStock(reference);

    if (result.status === "insufficient") {
      console.error(`ATENCIÓN: pedido pagado sin stock suficiente. ${result.issue}`);
    }

    await sendApprovedOrderEmail(reference);
  }

  if (changed && (newStatus === "refunded" || newStatus === "cancelled")) {
    await cancelAfterPaymentLoss(reference);
  }

  return { changed: Boolean(changed) };
}

// Si el pago se reintegró o cancelló y el pedido no salió, se cancela y vuelve el stock.
async function cancelAfterPaymentLoss(reference) {
  await tx(async (client) => {
    const { rows } = await client.query(
      `SELECT id, shipping_status, stock_status FROM orders
       WHERE external_reference = $1 FOR UPDATE`,
      [reference],
    );
    const order = rows[0];
    if (!order) return;

    if (["pending", "preparing"].includes(order.shipping_status)) {
      await client.query(
        `UPDATE orders
         SET shipping_status = 'cancelled', shipping_updated_at = now(), updated_at = now()
         WHERE id = $1`,
        [order.id],
      );
      await orders.addEvent(client, order.id, "shipping", "cancelled", "Pago devuelto o cancelado.");
      await stock.restockWithClient(client, order);
    }
  });
}

// Cambia el estado de envío desde el panel. Devuelve { order, statusChanged }.
async function changeShipping(code, { status, trackingNumber, note, notify }) {
  if (!SHIPPING_STATUSES.includes(status)) {
    const error = new Error("El estado de envío no es válido.");
    error.status = 400;
    throw error;
  }

  const result = await tx(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM orders WHERE tracking_code = $1 FOR UPDATE`,
      [code],
    );
    const order = rows[0];

    if (!order) {
      const error = new Error("No se encontró el pedido.");
      error.status = 404;
      throw error;
    }

    const wasCancelled = order.shipping_status === "cancelled";
    const statusChanged = order.shipping_status !== status;

    if (
      statusChanged &&
      ["preparing", "shipped", "delivered"].includes(status) &&
      order.payment_status !== "approved"
    ) {
      const error = new Error("El pago de este pedido todavía no está aprobado.");
      error.status = 409;
      throw error;
    }

    // Reactivar un pedido cancelado vuelve a descontar el stock.
    if (wasCancelled && status !== "cancelled" && order.stock_status === "restocked") {
      const redo = await stock.deductWithClient(client, { ...order, stock_status: "none" });

      if (redo.status === "insufficient") {
        const error = new Error(`No se puede reactivar: ${redo.issue}`);
        error.status = 409;
        throw error;
      }
    }

    const cleanTracking = String(trackingNumber ?? "").trim() || null;
    const cleanNote = String(note ?? "").trim() || null;

    const update = await client.query(
      `UPDATE orders
       SET shipping_status = $2,
           tracking_number = $3,
           shipping_note = $4,
           shipping_updated_at = CASE WHEN $5 THEN now() ELSE shipping_updated_at END,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [order.id, status, cleanTracking, cleanNote, statusChanged],
    );

    if (statusChanged) {
      await orders.addEvent(client, order.id, "shipping", status, cleanNote);
    }

    if (status === "cancelled" && !wasCancelled) {
      await stock.restockWithClient(client, order);
    }

    return { order: update.rows[0], statusChanged };
  });

  if (notify && result.statusChanged && result.order.customer_email && status !== "pending") {
    try {
      await sendShippingUpdate({
        to: result.order.customer_email,
        order: result.order,
        status,
        trackingNumber: result.order.tracking_number,
        note: result.order.shipping_note,
      });
      result.emailSent = true;
    } catch (error) {
      console.error("No se pudo enviar el mail de estado:", error.message);
      result.emailSent = false;
      result.emailError = error.message;
    }
  }

  return result;
}

module.exports = {
  SHIPPING_STATUSES,
  sendApprovedOrderEmail,
  applyPaymentStatus,
  changeShipping,
};
