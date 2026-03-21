const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL ga ulandi');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL xatosi:', err.message);
});

module.exports = pool;
