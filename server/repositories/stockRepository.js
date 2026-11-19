// Descuento y devolución de stock ligados a cada pedido (por su código).
const { tx } = require("../db/pool");
const { addEvent } = require("./ordersRepository");

// Descuenta el stock de un pedido ya pagado. Debe llamarse con el pedido
// bloqueado (SELECT ... FOR UPDATE) dentro de una transacción.
// Devuelve { status: 'deducted' | 'already' | 'insufficient', issue? }.
async function deductWithClient(client, order) {
  if (order.stock_status === "deducted" || order.stock_status === "restocked") {
    return { status: "already" };
  }

  const { rows: items } = await client.query(
    `SELECT product_id, product_name, size, SUM(quantity)::int AS quantity
     FROM order_items WHERE order_id = $1
     GROUP BY product_id, product_name, size
     ORDER BY product_id, size`,
    [order.id],
  );

  if (!items.length) {
    throw new Error("El pedido no tiene productos.");
  }

  // Se bloquean y validan todas las filas antes de tocar ninguna cantidad.
  let issue = null;

  for (const item of items) {
    const { rows } = await client.query(
      `SELECT quantity, configured FROM inventory
       WHERE product_id = $1 AND size = $2 FOR UPDATE`,
      [item.product_id, item.size],
    );
    const stock = rows[0];

    if (!stock || !stock.configured) {
      issue = `Falta cargar el stock de ${item.product_name}, talle ${item.size}.`;
    } else if (stock.quantity < item.quantity) {
      issue = `Stock insuficiente de ${item.product_name}, talle ${item.size} (hay ${stock.quantity}, el pedido pide ${item.quantity}).`;
    }

    if (issue) break;
  }

  if (issue) {
    await client.query(
      `UPDATE orders SET stock_status = 'insufficient', stock_issue = $2, updated_at = now()
       WHERE id = $1`,
      [order.id, issue],
    );
    await addEvent(client, order.id, "stock", "insufficient", issue);
    return { status: "insufficient", issue };
  }

  for (const item of items) {
    await client.query(
      `UPDATE inventory SET quantity = quantity - $3, updated_at = now()
       WHERE product_id = $1 AND size = $2`,
      [item.product_id, item.size, item.quantity],
    );
    await client.query(
      `INSERT INTO inventory_movements (order_id, product_id, size, quantity, kind)
       VALUES ($1,$2,$3,$4,'deduct')
       ON CONFLICT (order_id, product_id, size, kind) DO NOTHING`,
      [order.id, item.product_id, item.size, item.quantity],
    );
  }

  await client.query(
    `UPDATE orders SET stock_status = 'deducted', stock_issue = NULL, updated_at = now()
     WHERE id = $1`,
    [order.id],
  );
  await addEvent(client, order.id, "stock", "deducted", "Stock descontado.");

  return { status: "deducted" };
}

// Devuelve al stock lo que el pedido había descontado (una sola vez).
async function restockWithClient(client, order) {
  if (order.stock_status !== "deducted") return false;

  const { rows: items } = await client.query(
    `SELECT product_id, size, SUM(quantity)::int AS quantity
     FROM order_items WHERE order_id = $1
     GROUP BY product_id, size ORDER BY product_id, size`,
    [order.id],
  );

  for (const item of items) {
    await client.query(
      `UPDATE inventory SET quantity = quantity + $3, updated_at = now()
       WHERE product_id = $1 AND size = $2`,
      [item.product_id, item.size, item.quantity],
    );
    await client.query(
      `INSERT INTO inventory_movements (order_id, product_id, size, quantity, kind)
       VALUES ($1,$2,$3,$4,'restock')
       ON CONFLICT (order_id, product_id, size, kind) DO NOTHING`,
      [order.id, item.product_id, item.size, item.quantity],
    );
  }

  await client.query(
    `UPDATE orders SET stock_status = 'restocked', updated_at = now() WHERE id = $1`,
    [order.id],
  );
  await addEvent(client, order.id, "stock", "restocked", "Stock devuelto.");

  return true;
}

// Versión independiente: bloquea el pedido y descuenta su stock.
async function deductOrderStock(reference) {
  return tx(async (client) => {
    const { rows } = await client.query(
      `SELECT id, payment_status, stock_status FROM orders
       WHERE external_reference = $1 FOR UPDATE`,
      [reference],
    );
    const order = rows[0];

    if (!order) throw new Error("Pedido inexistente.");
    if (order.payment_status !== "approved") {
      throw new Error("El pedido todavía no está aprobado.");
    }

    return deductWithClient(client, order);
  });
}

module.exports = { deductWithClient, restockWithClient, deductOrderStock };
