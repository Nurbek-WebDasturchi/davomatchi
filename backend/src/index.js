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

// ─── Seed ────────────────────────────────────────────────
async function runSeed() {
  try {
    const check = await pool.query("SELECT COUNT(*) FROM users");
    if (parseInt(check.rows[0].count) > 0) {
      console.log("ℹ️ Seed allaqachon qilingan, o'tkazib yuborildi");
      return;
    }

    console.log("🌱 Seed boshlanmoqda...");

    // Kurslar
    await pool.query(`
      INSERT INTO courses (name, year) VALUES
        ('Birinchi kurs', 1),
        ('Ikkinchi kurs', 2),
        ('Uchinchi kurs', 3)
      ON CONFLICT DO NOTHING
    `);

    const courses = await pool.query("SELECT id FROM courses ORDER BY year");
    const [c1, c2, c3] = courses.rows.map((r) => r.id);

    // Admin — sizning Telegram ID ingiz
    await pool.query(`
      INSERT INTO users (telegram_id, full_name, username, role) VALUES
        (6401123819, 'Administrator', 'admin_user', 'admin')
      ON CONFLICT DO NOTHING
    `);

    // O'qituvchilar
    await pool.query(`
      INSERT INTO users (telegram_id, full_name, username, role) VALUES
        (111111111, 'Aziz Karimov',    'aziz_teacher',  'teacher'),
        (222222222, 'Malika Yusupova', 'malika_teacher', 'teacher'),
        (333333333, 'Bobur Toshmatov', 'bobur_teacher',  'teacher')
      ON CONFLICT DO NOTHING
    `);

    const teachers = await pool.query(
      `SELECT id FROM users WHERE role = 'teacher' ORDER BY id`,
    );
    const [t1, t2, t3] = teachers.rows.map((r) => r.id);

    // Guruhlar
    await pool.query(`
      INSERT INTO groups (name, course_id, teacher_id) VALUES
        ('IT-101', ${c1}, ${t1}),
        ('IT-102', ${c1}, ${t2}),
        ('IT-201', ${c2}, ${t3}),
        ('IT-202', ${c2}, ${t1}),
        ('IT-301', ${c3}, ${t2})
      ON CONFLICT DO NOTHING
    `);

    const groups = await pool.query("SELECT id FROM groups ORDER BY id");
    const [g1, g2, g3, g4, g5] = groups.rows.map((r) => r.id);

    await pool.query(
      `UPDATE users SET group_id = ${g1} WHERE telegram_id = 111111111`,
    );
    await pool.query(
      `UPDATE users SET group_id = ${g2} WHERE telegram_id = 222222222`,
    );
    await pool.query(
      `UPDATE users SET group_id = ${g3} WHERE telegram_id = 333333333`,
    );

    // Talabalar
    const students = [
      ["Abdullayev Jasur", g1, "STD-10001"],
      ["Karimova Nilufar", g1, "STD-10002"],
      ["Toshmatov Ulmas", g1, "STD-10003"],
      ["Yusupov Sardor", g1, "STD-10004"],
      ["Mirzayeva Dilnoza", g1, "STD-10005"],
      ["Rahimov Temur", g1, "STD-10006"],
      ["Nazarova Feruza", g2, "STD-10007"],
      ["Xasanov Bekzod", g2, "STD-10008"],
      ["Umarov Otabek", g2, "STD-10009"],
      ["Ergasheva Kamola", g2, "STD-10010"],
      ["Ismoilova Zulfiya", g3, "STD-10011"],
      ["Qodirov Mansur", g3, "STD-10012"],
      ["Haydarov Islom", g3, "STD-10013"],
      ["Tursunova Barno", g3, "STD-10014"],
      ["Mirzayev Alisher", g4, "STD-10015"],
      ["Holmatova Sabohat", g4, "STD-10016"],
      ["Yuldashev Farrux", g4, "STD-10017"],
      ["Botirov Sunnat", g5, "STD-10018"],
      ["Murodova Mahliyo", g5, "STD-10019"],
      ["Xoliqov Nodir", g5, "STD-10020"],
    ];

    for (const [name, gid, code] of students) {
      await pool.query(
        `INSERT INTO students (full_name, group_id, student_code)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [name, gid, code],
      );
    }

    console.log("✅ Seed tugadi!");
  } catch (err) {
    console.error("❌ Seed xatosi:", err.message);
  }
}

// ─── Serverni ishga tushirish ─────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`🚀 Backend http://localhost:${PORT} da ishlamoqda`);
  await runMigrations();
  await runSeed();
});
