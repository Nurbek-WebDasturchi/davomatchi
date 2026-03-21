require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pool = require("./db/pool");

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));

app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "https://web.telegram.org",
      /\.telegram\.org$/,
    ],
    credentials: true,
  }),
);

app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { error: "Juda ko'p so'rov. Keyinroq urinib ko'ring." },
  }),
);

app.use(
  "/api/attendance/scan",
  rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    message: { error: "Skanerlash limiti oshdi." },
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

app.use((req, res) => {
  res.status(404).json({ error: "Sahifa topilmadi" });
});

app.use((err, req, res, next) => {
  console.error("Server xatosi:", err.message);
  res.status(500).json({ error: "Ichki server xatosi" });
});

// ─── Migration ───────────────────────────────────────────
async function runMigrations() {
  try {
    console.log("🔄 Migration boshlanmoqda...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        full_name   VARCHAR(255) NOT NULL,
        username    VARCHAR(100),
        role        VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher')),
        group_id    INTEGER,
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) NOT NULL,
        year       INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) NOT NULL,
        course_id  INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        qr_token   VARCHAR(255) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_users_group'
        ) THEN
          ALTER TABLE users
          ADD CONSTRAINT fk_users_group
          FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL;
        END IF;
      END $$
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id           SERIAL PRIMARY KEY,
        full_name    VARCHAR(255) NOT NULL,
        student_code VARCHAR(50) UNIQUE,
        group_id     INTEGER REFERENCES groups(id) ON DELETE SET NULL,
        phone        VARCHAR(20),
        created_at   TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id         SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        group_id   INTEGER REFERENCES groups(id) ON DELETE SET NULL,
        date       DATE NOT NULL DEFAULT CURRENT_DATE,
        status     VARCHAR(20) NOT NULL DEFAULT 'present'
                   CHECK (status IN ('present', 'absent', 'late')),
        scanned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (student_id, date)
      )
    `);

    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_attendance_date    ON attendance(date)`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id)`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_students_group     ON students(group_id)`,
    );

    console.log("✅ Migration tugadi — barcha jadvallar tayyor!");
  } catch (err) {
    console.error("❌ Migration xatosi:", err.message);
  }
}

// ─── Serverni ishga tushirish ─────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`🚀 Backend http://localhost:${PORT} da ishlamoqda`);
  await runMigrations();
});
