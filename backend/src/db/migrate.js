const pool = require("./pool");
require("dotenv").config();

async function migrate() {
  let client;

  try {
    client = await pool.connect();
    console.log("🔄 Migration boshlanmoqda...");

    // ===================================
    // USERS TABLE
    // ===================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         VARCHAR(10) PRIMARY KEY,
        password   VARCHAR(255) NOT NULL,
        role       VARCHAR(30) NOT NULL CHECK (role IN (
                     'student', 'master', 'curator',
                     'director', 'deputy', 'attendance_manager'
                   )),
        first_name VARCHAR(100) NOT NULL,
        last_name  VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("  ✓ Users table created");

    // ===================================
    // COURSES TABLE
    // ===================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) NOT NULL,
        year       INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("  ✓ Courses table created");

    // ===================================
    // GROUPS TABLE
    // ===================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) NOT NULL UNIQUE,
        course_id  INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        qr_token   VARCHAR(255) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("  ✓ Groups table created");

    // ===================================
    // GROUP ASSIGNMENTS TABLE
    // ===================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_assignments (
        id       SERIAL PRIMARY KEY,
        user_id  VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (user_id, group_id)
      )
    `);
    console.log("  ✓ Group assignments table created");

    // ===================================
    // STUDENTS TABLE
    // ===================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id           VARCHAR(10) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        group_id     INTEGER REFERENCES groups(id) ON DELETE SET NULL,
        student_code VARCHAR(50) UNIQUE,
        phone        VARCHAR(20),
        created_at   TIMESTAMP DEFAULT NOW(),
        updated_at   TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("  ✓ Students table created");

    // ===================================
    // ATTENDANCE TABLE
    // ===================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id         SERIAL PRIMARY KEY,
        student_id VARCHAR(10) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE SET NULL,
        date       DATE NOT NULL DEFAULT CURRENT_DATE,
        status     VARCHAR(20) NOT NULL DEFAULT 'present'
                   CHECK (status IN ('present', 'absent', 'late')),
        marked_by  VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL,
        scanned_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (student_id, date)
      )
    `);
    console.log("  ✓ Attendance table created");

    // ===================================
    // INDEXES
    // ===================================
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_attendance_date    ON attendance(date)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_attendance_group   ON attendance(group_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_students_group     ON students(group_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_assignments_user   ON group_assignments(user_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_assignments_group  ON group_assignments(group_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_groups_course      ON groups(course_id)`,
    );
    console.log("  ✓ All indexes created");

    console.log("✅ Migration tugadi!");
  } catch (err) {
    console.error("❌ Migration xatosi:", err.message);
    console.error("   Error code:", err.code);
    console.error("   Error detail:", err.detail);

    // Production-da xato bo'lsa ham throw qilmaylik
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "⚠️  Production-da migration xato o'qibdi, davom etmoqda...",
      );
      // throw err ishlatmaymiz, davom etsin
    } else {
      throw err; // Development-da throw qilsin
    }
  } finally {
    if (client) {
      client.release();
    }
  }
}

module.exports = migrate;
