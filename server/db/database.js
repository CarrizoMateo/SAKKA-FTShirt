const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("Falta DATABASE_URL. Configurá la conexión de PostgreSQL en el entorno.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon requiere TLS. La cadena de conexión normalmente incluye sslmode=require.
  ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: true },
  max: Number(process.env.PG_POOL_MAX || 5),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on("error", (error) => {
  console.error("Error inesperado del pool PostgreSQL:", error);
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGSERIAL PRIMARY KEY,
      external_reference TEXT NOT NULL UNIQUE,
      provider_order_id TEXT UNIQUE,
      provider_payment_id TEXT,
      customer_email TEXT,
      total_amount NUMERIC(12, 2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'ARS',
      payment_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
      shipping_zone_id TEXT,
      shipping_zone_name TEXT,
      shipping_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      shipping_address TEXT,
      tracking_number TEXT,
      shipping_status TEXT NOT NULL DEFAULT 'pending',
      shipping_updated_at TIMESTAMPTZ,
      confirmation_email_sent_at TIMESTAMPTZ,
      confirmation_email_error TEXT,
      confirmation_email_status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id BIGSERIAL PRIMARY KEY,
      order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
      subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
      size TEXT,
      UNIQUE (order_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS inventory (
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      size TEXT NOT NULL CHECK (size IN ('S', 'M', 'L', 'XL', 'XXL')),
      quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
      configured SMALLINT NOT NULL DEFAULT 0 CHECK (configured IN (0, 1)),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (product_id, size)
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id BIGSERIAL PRIMARY KEY,
      external_reference TEXT NOT NULL,
      product_id TEXT NOT NULL,
      size TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (external_reference, product_id, size)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders (payment_status);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference ON inventory_movements (external_reference);
  `);

  console.log("Esquema PostgreSQL de SAKKA inicializado.");
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  initializeDatabase,
};
