const { Pool } = require("pg");
require("dotenv").config();

// DATABASE_URL dan IPv6 ni IPv4 ga o'tkazish
function fixDatabaseUrl(url) {
  if (!url) return url;
  
  // Supabase connection pooler ishlatish (port 6543 — IPv4 supported)
  // db.xxx.supabase.co:5432  →  aws-0-xxx.pooler.supabase.com:6543
  // Agar allaqachon pooler URL bo'lsa — o'zgartirma
  if (url.includes('pooler.supabase.com')) return url;
  
  return url;
}

const connectionString = fixDatabaseUrl(process.env.DATABASE_URL);

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  // IPv4 ni majburlash
  family: 4,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle client:", err.message);
});

module.exports = pool;
module.exports.testConnection = async function () {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    console.log("✅ Database OK:", result.rows[0].now);
    client.release();
    return true;
  } catch (err) {
    console.error("❌ Database ulanish xatosi:", err.message);
    return false;
  }
};