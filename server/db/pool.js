// Conexión a PostgreSQL (Neon). La URL va en la variable DATABASE_URL.
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error(
    "Falta DATABASE_URL (la cadena de conexión de Neon) en las variables de entorno.",
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX || 5),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});

pool.on("error", (error) => {
  console.error("Error inesperado en una conexión de la base:", error.message);
});

function query(text, params) {
  return pool.query(text, params);
}

// Ejecuta varias consultas dentro de una misma transacción.
async function tx(work) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Si el rollback falla, el error original es el importante.
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, tx };
