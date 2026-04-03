require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cron = require("node-cron");
const pool = require("./db/pool");
const migrate = require("./db/migrate");
const seed = require("./db/seed");

const app = express();

// ===================================
// TRUST PROXY — Render / production uchun ZARUR
// ===================================
app.set("trust proxy", 1);

// ===================================
// MIDDLEWARE
// ===================================

app.use(helmet({ contentSecurityPolicy: false }));

app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:5173",
      "https://web.telegram.org",
      /\.telegram\.org$/,
      /\.vercel\.app$/,
      /\.onrender\.com$/,
    ],
    credentials: true,
  }),
);

app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Juda ko'p so'rov." },
  }),
);

app.use(express.json({ limit: "10mb" }));

// ===================================
// HEALTH CHECK
// ===================================

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ===================================
// ROUTES
// ===================================

app.use("/api/auth", require("./routes/auth"));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/groups", require("./routes/groups"));
app.use("/api/students", require("./routes/students"));
app.use("/api/users", require("./routes/users"));

// ===================================
// ERROR HANDLING
// ===================================

app.use((req, res) => {
  res.status(404).json({ error: "Sahifa topilmadi" });
});

app.use((err, req, res, next) => {
  console.error("Server xatosi:", err.message);
  res.status(500).json({ error: "Ichki server xatosi" });
});

// ===================================
// SERVER START
// ===================================

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`🚀 Backend http://localhost:${PORT} da ishlamoqda`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);

  // Database ulanishini tekshirish
  const dbOk = await pool.testConnection();
  if (!dbOk) {
    console.error("❌ Database ulanmadi! DATABASE_URL ni tekshiring.");
    console.error("   Supabase Transaction Pooler URL kerak:");
    console.error(
      "   postgresql://postgres.xxx:[PASS]@aws-0-xxx.pooler.supabase.com:6543/postgres",
    );
    return;
  }

  try {
    console.log("🔄 Database migration boshlanmoqda...");
    await migrate();
    console.log("✅ Migration muvaffaqiyat bo'ldi!");
  } catch (err) {
    console.warn("⚠️  Migration xato:", err.message);
  }

  try {
    console.log("🌱 Seed data qo'shilmoqda...");
    await seed();
  } catch (err) {
    console.warn("⚠️  Seed xato:", err.message);
  }

  // KEEP-ALIVE
  const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
  cron.schedule("*/10 * * * *", async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/health`);
      console.log(`⏰ Keep-alive ping OK: ${res.status}`);
    } catch (err) {
      console.error("❌ Keep-alive ping xato:", err.message);
    }
  });

  console.log("⏰ Keep-alive cron job ishga tushdi (har 10 daqiqada)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  pool.end();
  process.exit(0);
});
