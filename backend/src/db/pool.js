const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,

  // ✅ Qo'shilgan optimizatsiyalar:
  max: 10, // Neon free: max 10 ta ulanish
  min: 2, // Doim 2 ta ulanish tayyor tursin
  idleTimeoutMillis: 30000, // 30 sek ishlatilmasa ulanishni yop
  connectionTimeoutMillis: 5000, // 5 sek ichida ulanolmasa xato ber
  allowExitOnIdle: false, // Server to'xtamasin
});

// Birinchi ulanishda log
let connected = false;
pool.on("connect", () => {
  if (!connected) {
    console.log("✅ PostgreSQL ga ulandi");
    connected = true;
  }
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL xatosi:", err.message);
});

// ✅ DB ham "uyg'oq" tursin — har 9 daqiqada oddiy query
const keepDbAlive = () => {
  setInterval(
    async () => {
      try {
        await pool.query("SELECT 1");
        console.log("🔄 DB keep-alive OK");
      } catch (err) {
        console.error("❌ DB keep-alive xato:", err.message);
      }
    },
    9 * 60 * 1000,
  ); // 9 daqiqa
};

keepDbAlive();

module.exports = pool;
