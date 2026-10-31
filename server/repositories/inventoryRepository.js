const { pool, query } = require("../db/database");

const SIZES = ["S", "M", "L", "XL", "XXL"];

const PRODUCTS = [
  { id: "1", name: "Juventus Kappa 1997/98" },
  { id: "2", name: "Paris Saint-Germain 2003/04" },
  { id: "3", name: "Real Madrid Kelme 1997/98" },
  { id: "4", name: "Real Madrid Fly Emirates 2025/26" },
  { id: "5", name: "Barcelona Kappa 1997/98" },
  { id: "6", name: "Japón One Piece" },
  { id: "7", name: "AC Milan Adidas 2011/12" },
  { id: "8", name: "Italia Adidas 2023/24" },
  { id: "9", name: "Fiorentina Lotto 1992/93" },
  { id: "10", name: "Alemania Adidas 1990" },
  { id: "11", name: "Japón Sakura Edition" },
  { id: "12", name: "Brasil Nike Azul" },
  { id: "13", name: "Juventus Kappa 1995/96" },
  { id: "14", name: "Napoli NR 1988/89" },
  { id: "15", name: "Napoli NR 1985/86" },
];

async function initializeInventory() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const product of PRODUCTS) {
      for (const size of SIZES) {
        await client.query(
          `
            INSERT INTO inventory (product_id, product_name, size, quantity, configured)
            VALUES ($1, $2, $3, 0, 0)
            ON CONFLICT (product_id, size)
            DO UPDATE SET product_name = EXCLUDED.product_name
          `,
          [product.id, product.name, size],
        );
      }
    }
    await client.query("COMMIT");
    console.log("Inventario de SAKKA inicializado.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function getInventory() {
  const result = await query(
    `
      SELECT product_id, product_name, size, quantity, configured, updated_at
      FROM inventory
      ORDER BY product_name,
        CASE size
          WHEN 'S' THEN 1
          WHEN 'M' THEN 2
          WHEN 'L' THEN 3
          WHEN 'XL' THEN 4
          WHEN 'XXL' THEN 5
        END
    `,
  );
  return result.rows;
}

async function setStock(productId, size, quantity) {
  const product = PRODUCTS.find((item) => item.id === String(productId));
  if (!product) throw new Error("Producto inexistente.");
  if (!SIZES.includes(size)) throw new Error("Talle inválido.");
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new Error("El stock debe ser un entero mayor o igual a cero.");
  }

  const result = await query(
    `
      UPDATE inventory
      SET quantity = $1, configured = 1, updated_at = NOW()
      WHERE product_id = $2 AND size = $3
      RETURNING product_id, product_name, size, quantity, configured, updated_at
    `,
    [quantity, product.id, size],
  );

  if (!result.rows[0]) throw new Error("No se encontró el talle en el inventario.");
  return result.rows[0];
}

/*
 * Descuenta stock una sola vez por pedido, únicamente después de verificar
 * el pago. Los bloqueos y la transacción evitan dobles descuentos por webhook.
 */
async function deductApprovedOrderStock(externalReference) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `
        SELECT id, payment_status
        FROM orders
        WHERE external_reference = $1
        FOR UPDATE
      `,
      [externalReference],
    );
    const order = orderResult.rows[0];

    if (!order) throw new Error("Pedido inexistente.");
    if (order.payment_status !== "approved") {
      throw new Error("El pedido todavía no está aprobado.");
    }

    const itemsResult = await client.query(
      `
        SELECT product_id, product_name, size, SUM(quantity)::INTEGER AS quantity
        FROM order_items
        WHERE order_id = $1
        GROUP BY product_id, product_name, size
      `,
      [order.id],
    );
    const items = itemsResult.rows;
    if (!items.length) throw new Error("El pedido no tiene productos.");

    const alreadyDeducted = await client.query(
      "SELECT 1 FROM inventory_movements WHERE external_reference = $1 LIMIT 1",
      [externalReference],
    );
    if (alreadyDeducted.rowCount > 0) {
      await client.query("COMMIT");
      return { deducted: false, reason: "already_processed" };
    }

    for (const item of items) {
      if (!item.size || !SIZES.includes(item.size)) {
        throw new Error(
          `El producto ${item.product_name} no tiene un talle válido.`,
        );
      }

      const stockResult = await client.query(
        `
          SELECT quantity, configured
          FROM inventory
          WHERE product_id = $1 AND size = $2
          FOR UPDATE
        `,
        [String(item.product_id), item.size],
      );
      const stock = stockResult.rows[0];

      if (!stock || Number(stock.configured) !== 1) {
        throw new Error(
          `Falta configurar el stock de ${item.product_name}, talle ${item.size}.`,
        );
      }
      if (Number(stock.quantity) < Number(item.quantity)) {
        throw new Error(
          `Stock insuficiente para ${item.product_name}, talle ${item.size}.`,
        );
      }
    }

    for (const item of items) {
      const quantity = Number(item.quantity);
      const result = await client.query(
        `
          UPDATE inventory
          SET quantity = quantity - $1, updated_at = NOW()
          WHERE product_id = $2
            AND size = $3
            AND configured = 1
            AND quantity >= $1
          RETURNING product_id
        `,
        [quantity, String(item.product_id), item.size],
      );

      if (result.rowCount !== 1) {
        throw new Error(
          `No se pudo descontar el stock de ${item.product_name}, talle ${item.size}.`,
        );
      }

      await client.query(
        `
          INSERT INTO inventory_movements
            (external_reference, product_id, size, quantity)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (external_reference, product_id, size) DO NOTHING
        `,
        [externalReference, String(item.product_id), item.size, quantity],
      );
    }

    await client.query("COMMIT");
    return { deducted: true, items: items.length };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  initializeInventory,
  getInventory,
  setStock,
  deductApprovedOrderStock,
};
