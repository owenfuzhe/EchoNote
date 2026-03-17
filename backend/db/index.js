const { Pool } = require('pg');

function isTruthy(value) {
  return ['1', 'true', 'yes', 'on', 'require'].includes(String(value || '').toLowerCase());
}

function buildPoolConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: isTruthy(process.env.DATABASE_SSL || process.env.PGSSLMODE)
        ? { rejectUnauthorized: false }
        : undefined,
    };
  }

  if (!process.env.PGHOST) return null;

  return {
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: isTruthy(process.env.DATABASE_SSL || process.env.PGSSLMODE)
      ? { rejectUnauthorized: false }
      : undefined,
  };
}

const poolConfig = buildPoolConfig();
const pool = poolConfig ? new Pool(poolConfig) : null;

async function query(text, params) {
  if (!pool) throw new Error('DATABASE_NOT_CONFIGURED');
  return pool.query(text, params);
}

async function withTransaction(work) {
  if (!pool) throw new Error('DATABASE_NOT_CONFIGURED');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function isDbConfigured() {
  return Boolean(pool);
}

module.exports = {
  isDbConfigured,
  query,
  withTransaction,
};
