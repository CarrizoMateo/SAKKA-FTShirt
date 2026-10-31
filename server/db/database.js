
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// La base se guarda en server/data/sakka.db
const databasePath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, "..", "data", "sakka.db");

const dataDirectory = path.dirname(databasePath);

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}
const db = new Database(databasePath);

db.pragma("foreign_keys = ON");

// Tabla principal de pedidos.
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_reference TEXT NOT NULL UNIQUE,
    provider_order_id TEXT UNIQUE,
    provider_payment_id TEXT,
    customer_email TEXT,
    total_amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ARS',
    payment_status TEXT NOT NULL DEFAULT 'pending'
      CHECK (payment_status IN (
        'pending',
        'approved',
        'rejected',
        'cancelled',
        'refunded'
      )),
    shipping_zone_id TEXT,
    shipping_zone_name TEXT,
    shipping_amount REAL NOT NULL DEFAULT 0,
    shipping_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migraciones para bases de datos ya existentes.
// CREATE TABLE IF NOT EXISTS no agrega columnas a una tabla anterior.
function ensureColumn(tableName, columnName, definition) {
  const columns = db.pragma(`table_info(${tableName})`);
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    db.exec(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`
    );
  }
}

ensureColumn("orders", "provider_payment_id", "TEXT");
ensureColumn("orders", "shipping_zone_id", "TEXT");
ensureColumn("orders", "shipping_zone_name", "TEXT");
ensureColumn(
  "orders",
  "shipping_amount",
  "REAL NOT NULL DEFAULT 0"
);
ensureColumn("orders", "shipping_address", "TEXT");
// Seguimiento logístico de los pedidos.
ensureColumn("orders", "tracking_number", "TEXT");
ensureColumn(
  "orders",
  "shipping_status",
  "TEXT NOT NULL DEFAULT 'pending'"
);
// Control de emails transaccionales.
ensureColumn("orders", "confirmation_email_sent_at", "TEXT");
ensureColumn("orders", "confirmation_email_error", "TEXT");
ensureColumn(
  "orders",
  "confirmation_email_status",
  "TEXT NOT NULL DEFAULT 'pending'"
);
// Productos del pedido. El envío no se guarda como producto.
db.exec(`
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    subtotal REAL NOT NULL CHECK (subtotal >= 0),

    FOREIGN KEY (order_id)
      REFERENCES orders(id)
      ON DELETE CASCADE,

    UNIQUE (order_id, product_id)
  );
`);

ensureColumn("order_items", "size", "TEXT");

console.log("Base de datos SQLite de SAKKA inicializada.");

module.exports = db;
