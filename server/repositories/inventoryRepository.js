
const db = require("../db/database");

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

// Inventario independiente por modelo y talle.
db.exec(`
  CREATE TABLE IF NOT EXISTS inventory (
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    size TEXT NOT NULL CHECK (size IN ('S', 'M', 'L', 'XL', 'XXL')),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    configured INTEGER NOT NULL DEFAULT 0 CHECK (configured IN (0, 1)),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (product_id, size)
  );

  CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_reference TEXT NOT NULL,
    product_id TEXT NOT NULL,
    size TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (external_reference, product_id, size)
  );
`);

// Crear las combinaciones sin establecer stock inicial.
const insertInitial = db.prepare(`
  INSERT OR IGNORE INTO inventory
    (product_id, product_name, size, quantity, configured)
  VALUES (?, ?, ?, 0, 0)
`);

const initialize = db.transaction(() => {
  for (const product of PRODUCTS) {
    for (const size of SIZES) {
      insertInitial.run(product.id, product.name, size);

      db.prepare(`
        UPDATE inventory
        SET product_name = ?
        WHERE product_id = ? AND size = ?
      `).run(product.name, product.id, size);
    }
  }
});

initialize();

function getInventory() {
  return db.prepare(`
    SELECT product_id, product_name, size, quantity, configured, updated_at
    FROM inventory
    ORDER BY product_name, CASE size
      WHEN 'S' THEN 1
      WHEN 'M' THEN 2
      WHEN 'L' THEN 3
      WHEN 'XL' THEN 4
      WHEN 'XXL' THEN 5
    END
  `).all();
}

function setStock(productId, size, quantity) {
  const product = PRODUCTS.find((p) => p.id === String(productId));

  if (!product) throw new Error("Producto inexistente.");
  if (!SIZES.includes(size)) throw new Error("Talle inválido.");
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new Error("El stock debe ser un entero mayor o igual a cero.");
  }

  db.prepare(`
    UPDATE inventory
    SET quantity = ?,
        configured = 1,
        updated_at = datetime('now')
    WHERE product_id = ? AND size = ?
  `).run(quantity, product.id, size);

  return db.prepare(`
    SELECT product_id, product_name, size, quantity, configured, updated_at
    FROM inventory
    WHERE product_id = ? AND size = ?
  `).get(product.id, size);
}

/*
 * Descuenta el stock una sola vez por pedido.
 * Debe llamarse exclusivamente cuando el pago fue verificado
 * como aprobado. Si falta stock, revierte todos los descuentos.
 */
function deductApprovedOrderStock(externalReference) {
  const deduct = db.transaction(() => {
    const order = db.prepare(`
      SELECT id, payment_status
      FROM orders
      WHERE external_reference = ?
    `).get(externalReference);

    if (!order) throw new Error("Pedido inexistente.");

    if (order.payment_status !== "approved") {
      throw new Error("El pedido todavía no está aprobado.");
    }

    const items = db.prepare(`
      SELECT product_id, product_name, size, SUM(quantity) AS quantity
      FROM order_items
      WHERE order_id = ?
      GROUP BY product_id, product_name, size
    `).all(order.id);

    if (!items.length) throw new Error("El pedido no tiene productos.");

    // Reintento de un webhook: no volver a descontar.
    const alreadyDeducted = db.prepare(`
      SELECT 1
      FROM inventory_movements
      WHERE external_reference = ?
      LIMIT 1
    `).get(externalReference);

    if (alreadyDeducted) {
      return { deducted: false, reason: "already_processed" };
    }

    // Validar todo antes de modificar cualquier cantidad.
    for (const item of items) {
      if (!item.size || !SIZES.includes(item.size)) {
        throw new Error(
          `El producto ${item.product_name} no tiene un talle válido.`
        );
      }

      const stock = db.prepare(`
        SELECT quantity, configured
        FROM inventory
        WHERE product_id = ? AND size = ?
      `).get(String(item.product_id), item.size);

      if (!stock || stock.configured !== 1) {
        throw new Error(
          `Falta configurar el stock de ${item.product_name}, talle ${item.size}.`
        );
      }

      if (stock.quantity < Number(item.quantity)) {
        throw new Error(
          `Stock insuficiente para ${item.product_name}, talle ${item.size}.`
        );
      }
    }

    const decrement = db.prepare(`
      UPDATE inventory
      SET quantity = quantity - ?,
          updated_at = datetime('now')
      WHERE product_id = ?
        AND size = ?
        AND configured = 1
        AND quantity >= ?
    `);

    const insertMovement = db.prepare(`
      INSERT INTO inventory_movements
        (external_reference, product_id, size, quantity)
      VALUES (?, ?, ?, ?)
    `);

    for (const item of items) {
      const quantity = Number(item.quantity);

      const result = decrement.run(
        quantity,
        String(item.product_id),
        item.size,
        quantity
      );

      if (result.changes !== 1) {
        throw new Error(
          `No se pudo descontar el stock de ${item.product_name}, talle ${item.size}.`
        );
      }

      insertMovement.run(
        externalReference,
        String(item.product_id),
        item.size,
        quantity
      );
    }

    return { deducted: true, items: items.length };
  });

  return deduct.immediate();
}

module.exports = {
  getInventory,
  setStock,
  deductApprovedOrderStock,
};
