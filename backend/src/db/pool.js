const { Pool } = require("pg");
require("dotenv").config();

// ===================================
// DATABASE CONNECTION POOL
// ===================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // ← SUPABASE UCHUN ZARUR!
  },
  // Connection pool settings
  max: 10, // Maximum connections
  idleTimeoutMillis: 30000, // 30 sekunddan so'ng o'chir
  connectionTimeoutMillis: 5000, // 5 sekund timeout
});

// ===================================
// CONNECTION ERROR HANDLING
// ===================================

pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle client:", err.message);
});

pool.on("connect", () => {
  console.log("✅ Database connection established");
});

pool.on("remove", () => {
  console.log("⚠️  A client has been removed from the pool");
});

// ===================================
// TEST CONNECTION
// ===================================

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    console.log("✅ Database connection test successful:", result.rows[0]);
    client.release();
    return true;
  } catch (err) {
    console.error("❌ Database connection test failed:", err.message);
    return false;
  }
}

// Test connection on startup (optional)
if (process.env.NODE_ENV !== "production") {
  testConnection();
}

// ===================================
// EXPORTS
// ===================================

module.exports = pool;
module.exports.testConnection = testConnection;
