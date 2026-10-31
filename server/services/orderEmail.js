
const { sendOrderConfirmation } = require("./emailService");

const {
  findOrderByReference,
  getOrderItemsByReference,
  claimEmail,
  markEmailSent,
  markEmailError,
} = require("../repositories/ordersRepository");

async function sendApprovedOrderEmail(reference) {
  const order = findOrderByReference(reference);

  if (!order || order.payment_status !== "approved") {
    return;
  }

  if (!order.customer_email) {
    console.warn("Pedido sin email de cliente:", reference);
    return;
  }

  // Solo una ejecución puede reclamar el envío.
  if (!claimEmail(reference)) {
    return;
  }

  try {
    const items = getOrderItemsByReference(reference);

    if (!items.length) {
      throw new Error("El pedido no tiene productos registrados.");
    }

    await sendOrderConfirmation({
      to: order.customer_email,
      order,
      items,
    });

    markEmailSent(reference);
    console.log("Email de confirmación enviado:", reference);
  } catch (error) {
    markEmailError(error.message, reference);
    console.error("Error enviando email de SAKKA:", error.message);
  }
}

module.exports = { sendApprovedOrderEmail };
