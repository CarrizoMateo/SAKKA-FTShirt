const db = require("../db/database");

const createOrder = db.prepare(`
  INSERT INTO orders (
    external_reference,
    provider_order_id,
    provider_payment_id,
    customer_email,
    total_amount,
    currency,
    payment_status,
    shipping_zone_id,
    shipping_zone_name,
    shipping_amount,
    shipping_address
  ) VALUES (
    @external_reference,
    @provider_order_id,
    @provider_payment_id,
    @customer_email,
    @total_amount,
    @currency,
    @payment_status,
    @shipping_zone_id,
    @shipping_zone_name,
    @shipping_amount,
    @shipping_address
  )
`);

const findOrderByReference = db.prepare(`
  SELECT *
  FROM orders
  WHERE external_reference = ?
`);

const findOrderByProviderId = db.prepare(`
  SELECT *
  FROM orders
  WHERE provider_order_id = ?
`);

const updatePaymentStatus = db.prepare(`
  UPDATE orders
  SET payment_status = ?, updated_at = datetime('now')
  WHERE external_reference = ?
    AND (
      payment_status != 'approved'
      OR ? = 'refunded'
    )
`);

const updateProviderPayment = db.prepare(`
  UPDATE orders
  SET provider_payment_id = ?,
      updated_at = datetime('now')
  WHERE external_reference = ?
`);

const insertOrderItem = db.prepare(`
  INSERT INTO order_items (
    order_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    subtotal,
    size
  )
  VALUES (
    @order_id,
    @product_id,
    @product_name,
    @quantity,
    @unit_price,
    @subtotal,
    @size
  )
`);

const findOrderId = db.prepare(`
  SELECT id
  FROM orders
  WHERE external_reference = ?
`);

const findOrderItems = db.prepare(`
  SELECT
    product_id,
    product_name,
    quantity,
    unit_price,
    subtotal,
    size
  FROM order_items
  WHERE order_id = ?
`);

const findOrderItemsByReference = db.prepare(`
  SELECT
  oi.product_id,
  oi.product_name,
  oi.quantity,
  oi.unit_price,
  oi.subtotal,
  oi.size
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.external_reference = ?
`);

const claimConfirmationEmail = db.prepare(`
  UPDATE orders
  SET confirmation_email_status = 'sending',
      confirmation_email_error = NULL,
      updated_at = datetime('now')
  WHERE external_reference = ?
    AND payment_status = 'approved'
    AND customer_email IS NOT NULL
    AND customer_email != ''
    AND (
      confirmation_email_status IN ('pending', 'error')
      OR (
        confirmation_email_status = 'sending'
        AND updated_at < datetime('now', '-15 minutes')
      )
    )
`);

const markConfirmationEmailSent = db.prepare(`
  UPDATE orders
  SET confirmation_email_status = 'sent',
      confirmation_email_sent_at = datetime('now'),
      confirmation_email_error = NULL,
      updated_at = datetime('now')
  WHERE external_reference = ?
`);

const markConfirmationEmailError = db.prepare(`
  UPDATE orders
  SET confirmation_email_status = 'error',
      confirmation_email_error = ?,
      updated_at = datetime('now')
  WHERE external_reference = ?
    AND confirmation_email_status = 'sending'
`);

function saveOrder(order) {
  const address =
    order.shipping_address == null
      ? null
      : typeof order.shipping_address === "string"
        ? order.shipping_address
        : JSON.stringify(order.shipping_address);

  return createOrder.run({
    external_reference: order.external_reference,
    provider_order_id: order.provider_order_id ?? null,
    provider_payment_id: order.provider_payment_id ?? null,
    customer_email: order.customer_email ?? null,
    total_amount: order.total_amount,
    currency: order.currency ?? "ARS",
    payment_status: order.payment_status ?? "pending",
    shipping_zone_id: order.shipping_zone_id ?? null,
    shipping_zone_name: order.shipping_zone_name ?? null,
    shipping_amount: order.shipping_amount ?? 0,
    shipping_address: address,
  });
}


function saveOrderItems(externalReference, items) {
  const order = findOrderId.get(externalReference);

  if (!order) {
    throw new Error("No existe el pedido para guardar sus productos.");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("El pedido debe tener al menos un producto.");
  }

  const normalize = (list) =>
    list
      .map((item) => ({
        id: String(item.product_id ?? item.id),
        name: item.product_name ?? item.name,
        quantity: Number(item.quantity),
        price: Number(item.unit_price ?? item.price),
        size: String(item.size ?? item.talle ?? "").trim() || null,
      }))
      .sort((a, b) =>
        a.id.localeCompare(b.id) ||
        String(a.size ?? "").localeCompare(String(b.size ?? ""))
      );

  const existingItems = findOrderItems.all(order.id);

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
        "Los productos no coinciden con los ya guardados en el pedido."
      );
    }

    return;
  }

  const insertAll = db.transaction(() => {
    for (const item of items) {
      insertOrderItem.run({
        order_id: order.id,
        product_id: String(item.id),
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
        size: item.size ?? item.talle ?? null,
      });
    }
  });

  insertAll();
}


const linkProviderOrder = db.prepare(`
  UPDATE orders
  SET provider_order_id = ?,
      updated_at = datetime('now')
  WHERE external_reference = ?
`);

function getOrderItemsByReference(reference) {
  return findOrderItemsByReference.all(reference);
}

function claimEmail(reference) {
  return claimConfirmationEmail.run(reference).changes === 1;
}

function markEmailSent(reference) {
  return markConfirmationEmailSent.run(reference);
}

function markEmailError(message, reference) {
  return markConfirmationEmailError.run(
    String(message).slice(0, 500),
    reference,
  );
}

module.exports = {
  saveOrder,
  saveOrderItems,
  getOrderItemsByReference,
  claimEmail,
  markEmailSent,
  markEmailError,

  findOrderByReference: (reference) => findOrderByReference.get(reference),

  findOrderByProviderId: (providerId) => findOrderByProviderId.get(providerId),

  updatePaymentStatus: (status, reference) =>
    updatePaymentStatus.run(status, reference, status),

  linkProviderOrder: (providerId, reference) =>
    linkProviderOrder.run(providerId, reference),

  updateProviderPayment: (paymentId, reference) =>
    updateProviderPayment.run(paymentId, reference),
};
