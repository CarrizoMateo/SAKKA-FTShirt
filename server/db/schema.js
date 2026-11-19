// Crea las tablas si no existen y carga el catálogo y las tarifas iniciales.
// Es seguro ejecutarlo en cada arranque del servidor.
const { pool, tx } = require("./pool");
const { PRODUCTS } = require("../config/catalog");
const { SHIPPING_ZONES } = require("../config/shippingSeed");

const SIZES = ["S", "M", "L", "XL", "XXL"];

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL CHECK (price > 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS inventory (
    product_id TEXT NOT NULL REFERENCES products(id) ON UPDATE CASCADE,
    size TEXT NOT NULL CHECK (size IN ('S','M','L','XL','XXL')),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    configured BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (product_id, size)
  );

  CREATE TABLE IF NOT EXISTS shipping_zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    province TEXT NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    external_reference TEXT NOT NULL UNIQUE,
    tracking_code TEXT NOT NULL UNIQUE,
    provider_order_id TEXT UNIQUE,
    provider_payment_id TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    total_amount INTEGER NOT NULL CHECK (total_amount > 0),
    currency TEXT NOT NULL DEFAULT 'ARS',
    payment_status TEXT NOT NULL DEFAULT 'pending'
      CHECK (payment_status IN ('pending','approved','rejected','cancelled','refunded')),
    shipping_zone_id TEXT,
    shipping_zone_name TEXT,
    shipping_amount INTEGER NOT NULL DEFAULT 0,
    shipping_address JSONB,
    shipping_status TEXT NOT NULL DEFAULT 'pending'
      CHECK (shipping_status IN ('pending','preparing','shipped','delivered','cancelled')),
    tracking_number TEXT,
    shipping_note TEXT,
    shipping_updated_at TIMESTAMPTZ,
    stock_status TEXT NOT NULL DEFAULT 'none'
      CHECK (stock_status IN ('none','deducted','insufficient','restocked')),
    stock_issue TEXT,
    confirmation_email_status TEXT NOT NULL DEFAULT 'pending'
      CHECK (confirmation_email_status IN ('pending','sending','sent','error')),
    confirmation_email_sent_at TIMESTAMPTZ,
    confirmation_email_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);

  CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    size TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
    subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
    UNIQUE (order_id, product_id, size)
  );

  CREATE TABLE IF NOT EXISTS order_events (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    status TEXT,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS order_events_order_idx ON order_events (order_id, id);

  CREATE TABLE IF NOT EXISTS inventory_movements (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    size TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    kind TEXT NOT NULL CHECK (kind IN ('deduct','restock')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (order_id, product_id, size, kind)
  );
`;

async function ensureSchema() {
  await pool.query(SCHEMA);

  await tx(async (client) => {
    for (const [index, product] of PRODUCTS.entries()) {
      const { id, name, price, ...meta } = product;

      // El nombre y los datos de presentación vienen del código;
      // el precio y la visibilidad, una vez cargados, los maneja el panel.
      await client.query(
        `INSERT INTO products (id, name, price, sort_order, meta)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT (id) DO UPDATE
           SET name = EXCLUDED.name,
               sort_order = EXCLUDED.sort_order,
               meta = EXCLUDED.meta`,
        [id, name, price, index, JSON.stringify(meta)],
      );

      for (const size of SIZES) {
        await client.query(
          `INSERT INTO inventory (product_id, size)
           VALUES ($1, $2)
           ON CONFLICT (product_id, size) DO NOTHING`,
          [id, size],
        );
      }
    }

    for (const zone of SHIPPING_ZONES) {
      await client.query(
        `INSERT INTO shipping_zones (id, name, province, price)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [zone.id, zone.name, zone.province, zone.price],
      );
    }
  });

  console.log(
    `Base de datos lista: ${PRODUCTS.length} camisetas y ${SHIPPING_ZONES.length} localidades de envío.`,
  );
}

module.exports = { ensureSchema, SIZES };
