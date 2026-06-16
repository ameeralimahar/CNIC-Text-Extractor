const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 300000,
    acquireTimeoutMillis: 30000
  },
  requestTimeout: 30000,
  connectionTimeout: 15000
};

let pool;
let connecting = false;

async function getPool() {
  if (pool && pool.connected && !pool._closed) {
    return pool;
  }

  if (connecting) {
    await new Promise(r => setTimeout(r, 1000));
    if (pool && pool.connected) return pool;
  }

  connecting = true;
  try {
    if (pool) {
      try { await pool.close(); } catch (_) {}
    }
    pool = await sql.connect(config);
    pool.on('error', (err) => {
      console.error('Pool error, will reconnect:', err.message);
      pool = null;
    });
    return pool;
  } finally {
    connecting = false;
  }
}

// Keep connection alive with periodic pings
setInterval(async () => {
  try {
    if (pool && pool.connected) {
      await pool.request().query('SELECT 1');
    }
  } catch (_) {
    pool = null;
  }
}, 60000);

module.exports = { getPool, sql };
