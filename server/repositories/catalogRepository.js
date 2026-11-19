// Catálogo, stock por talle y tarifas de envío.
const { query, tx } = require("../db/pool");

const SIZES = ["S", "M", "L", "XL", "XXL"];

// ---------------------------------------------------------------
// Catálogo público (solo camisetas visibles). El stock de un talle
// sin cargar se informa como 0.
// ---------------------------------------------------------------
async function getPublicCatalog() {
  const { rows } = await query(`
    SELECT p.id, p.name, p.price, p.meta,
      COALESCE(
        json_object_agg(
          i.size,
          CASE WHEN i.configured THEN i.quantity ELSE 0 END
        ) FILTER (WHERE i.size IS NOT NULL),
        '{}'::json
      ) AS stock
    FROM products p
    LEFT JOIN inventory i ON i.product_id = p.id
    WHERE p.active
    GROUP BY p.id
    ORDER BY p.sort_order, p.id
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    price: Number(row.price),
    ...row.meta,
    stock: Object.fromEntries(
      SIZES.map((size) => [size, Number(row.stock[size] ?? 0)]),
    ),
  }));
}

// Catálogo completo para el panel (incluye ocultas y si el stock fue cargado).
async function getAdminCatalog() {
  const { rows } = await query(`
    SELECT p.id, p.name, p.price, p.active, p.meta, p.updated_at,
      COALESCE(
        json_object_agg(
          i.size,
          json_build_object('quantity', i.quantity, 'configured', i.configured)
        ) FILTER (WHERE i.size IS NOT NULL),
        '{}'::json
      ) AS stock
    FROM products p
    LEFT JOIN inventory i ON i.product_id = p.id
    GROUP BY p.id
    ORDER BY p.sort_order, p.id
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    price: Number(row.price),
    active: row.active,
    season: row.meta.season || "",
    kit: row.meta.kit,
    team: row.meta.team,
    updatedAt: row.updated_at,
    stock: Object.fromEntries(
      SIZES.map((size) => [
        size,
        {
          quantity: Number(row.stock[size]?.quantity ?? 0),
          configured: Boolean(row.stock[size]?.configured),
        },
      ]),
    ),
  }));
}

// Productos por id, para validar el carrito con precios del servidor.
async function getProductsByIds(ids) {
  if (!ids.length) return new Map();

  const { rows } = await query(
    `SELECT id, name, price, active FROM products WHERE id = ANY($1::text[])`,
    [ids],
  );

  return new Map(
    rows.map((row) => [
      row.id,
      { id: row.id, name: row.name, price: Number(row.price), active: row.active },
    ]),
  );
}

// Stock disponible de pares (producto, talle). Un talle sin cargar vale 0.
async function getAvailableStock(pairs) {
  const ids = [...new Set(pairs.map((pair) => pair.id))];
  if (!ids.length) return new Map();

  const { rows } = await query(
    `SELECT product_id, size, quantity, configured
     FROM inventory WHERE product_id = ANY($1::text[])`,
    [ids],
  );

  return new Map(
    rows.map((row) => [
      `${row.product_id}|${row.size}`,
      row.configured ? Number(row.quantity) : 0,
    ]),
  );
}

// Actualiza precio, visibilidad y/o stock de una camiseta en un solo paso.
// patch = { price?, active?, stock?: { S: 3, M: 0, ... } }
async function updateProduct(id, patch) {
  return tx(async (client) => {
    const current = await client.query(
      `SELECT id FROM products WHERE id = $1 FOR UPDATE`,
      [id],
    );

    if (!current.rows.length) {
      const error = new Error("No existe esa camiseta.");
      error.status = 404;
      throw error;
    }

    if (patch.price !== undefined) {
      await client.query(
        `UPDATE products SET price = $2, updated_at = now() WHERE id = $1`,
        [id, patch.price],
      );
    }

    if (patch.active !== undefined) {
      await client.query(
        `UPDATE products SET active = $2, updated_at = now() WHERE id = $1`,
        [id, patch.active],
      );
    }

    for (const [size, quantity] of Object.entries(patch.stock ?? {})) {
      await client.query(
        `UPDATE inventory
         SET quantity = $3, configured = TRUE, updated_at = now()
         WHERE product_id = $1 AND size = $2`,
        [id, size, quantity],
      );
    }
  });
}

// ---------------------------------------------------------------
// Tarifas de envío por localidad
// ---------------------------------------------------------------
function mapZone(row) {
  return {
    id: row.id,
    name: row.name,
    province: row.province,
    price: Number(row.price),
    active: row.active,
  };
}

async function getShippingZones({ includeInactive = false } = {}) {
  const { rows } = await query(
    `SELECT id, name, province, price, active
     FROM shipping_zones
     ${includeInactive ? "" : "WHERE active"}
     ORDER BY province, name`,
  );

  return rows.map(mapZone);
}

async function getShippingZone(id) {
  if (typeof id !== "string" || !id) return null;

  const { rows } = await query(
    `SELECT id, name, province, price, active
     FROM shipping_zones WHERE id = $1 AND active`,
    [id],
  );

  return rows[0] ? mapZone(rows[0]) : null;
}

async function createShippingZone({ id, name, province, price }) {
  const { rows } = await query(
    `INSERT INTO shipping_zones (id, name, province, price)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING
     RETURNING id, name, province, price, active`,
    [id, name, province, price],
  );

  return rows[0] ? mapZone(rows[0]) : null;
}

async function updateShippingZone(id, patch) {
  const { rows } = await query(
    `UPDATE shipping_zones
     SET name = COALESCE($2, name),
         province = COALESCE($3, province),
         price = COALESCE($4, price),
         active = COALESCE($5, active),
         updated_at = now()
     WHERE id = $1
     RETURNING id, name, province, price, active`,
    [id, patch.name ?? null, patch.province ?? null, patch.price ?? null, patch.active ?? null],
  );

  return rows[0] ? mapZone(rows[0]) : null;
}

async function deleteShippingZone(id) {
  const result = await query(`DELETE FROM shipping_zones WHERE id = $1`, [id]);
  return result.rowCount > 0;
}

module.exports = {
  SIZES,
  getPublicCatalog,
  getAdminCatalog,
  getProductsByIds,
  getAvailableStock,
  updateProduct,
  getShippingZones,
  getShippingZone,
  createShippingZone,
  updateShippingZone,
  deleteShippingZone,
};
