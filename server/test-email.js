
require("dotenv").config();

const { sendOrderConfirmation } = require("./services/emailService");

async function main() {
  const recipient = process.argv[2];

  if (!recipient || !recipient.includes("@")) {
    console.error("Uso: node test-email.js tu@email.com");
    process.exitCode = 1;
    return;
  }

  const fakeOrder = {
    external_reference: "SAKKA-TEST-EMAIL",
    total_amount: 49000,
    shipping_amount: 5000,
  };

  const fakeItems = [
    {
      product_name: "AC Milan Retro 2006",
      quantity: 1,
      unit_price: 44000,
      subtotal: 44000,
    },
  ];

  try {
    const result = await sendOrderConfirmation({
      to: recipient,
      order: fakeOrder,
      items: fakeItems,
    });

    console.log("Resend aceptó el email de prueba.");
    console.log("ID del email:", result.id);
    console.log("Pedido ficticio:", fakeOrder.external_reference);
  } catch (error) {
    console.error("Falló el envío de prueba:", error.message);
    process.exitCode = 1;
  }
}

main();
