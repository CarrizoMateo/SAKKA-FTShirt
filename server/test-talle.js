
const db = require("./db/database");
const { saveOrder, saveOrderItems } = require("./repositories/ordersRepository");

const reference = `TEST-TALLE-${Date.now()}`;

try {
  db.transaction(() => {
    saveOrder({
      external_reference: reference,
      total_amount: 45000,
      currency: "ARS",
      payment_status: "pending",
    });

    saveOrderItems(reference, [
      {
        id: "4",
        name: "Real Madrid 2002",
        quantity: 1,
        price: 45000,
        size: "M",
      },
    ]);

    const order = db
      .prepare("SELECT id FROM orders WHERE external_reference = ?")
      .get(reference);

    const item = db
      .prepare("SELECT product_name, size FROM order_items WHERE order_id = ?")
      .get(order.id);

    console.log("RESULTADO:", item);

    throw new Error("ROLLBACK_TEST");
  })();
} catch (error) {
  if (error.message === "ROLLBACK_TEST") {
    console.log("Prueba revertida; no quedó el pedido de prueba.");
  } else {
    console.error("ERROR:", error.message);
    process.exitCode = 1;
  }
} finally {
  db.close();
}

