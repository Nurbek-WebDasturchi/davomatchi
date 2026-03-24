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

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "https://web.telegram.org",
      /\.telegram\.org$/,
      /\.vercel\.app$/,
    ],
    credentials: true,
  }),
);

app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { error: "Juda ko'p so'rov." },
  }),
);

app.use(express.json({ limit: "10mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/groups", require("./routes/groups"));
app.use("/api/students", require("./routes/students"));
app.use("/api/users", require("./routes/users"));

app.use((req, res) => res.status(404).json({ error: "Sahifa topilmadi" }));
app.use((err, req, res, next) => {
  console.error("Server xatosi:", err.message);
  res.status(500).json({ error: "Ichki server xatosi" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`🚀 Backend http://localhost:${PORT} da ishlamoqda`);
  await migrate();
  await seed();

  // ✅ Keep-alive: Render free tier "uxlab qolmasin"
  const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
  cron.schedule("*/10 * * * *", async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/health`);
      console.log(`⏰ Keep-alive ping OK: ${res.status}`);
    } catch (err) {
      console.error("❌ Keep-alive ping xato:", err.message);
    }
  });
  console.log("⏰ Keep-alive cron ishga tushdi");
});
