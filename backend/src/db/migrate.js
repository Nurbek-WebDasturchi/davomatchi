const pool = require("./pool");
require("dotenv").config();

async function migrate() {
  let client;
  try {
    client = await pool.connect();
    console.log("🔄 Migration boshlanmoqda...");

    // USERS
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         VARCHAR(10) PRIMARY KEY,
        password   VARCHAR(255) NOT NULL,
        role       VARCHAR(30)  NOT NULL CHECK (role IN (
                     'student','master','curator',
                     'director','deputy','attendance_manager'
                   )),
        first_name VARCHAR(100) NOT NULL,
        last_name  VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("  ✓ users");

    // COURSES
    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) NOT NULL,
        year       INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("  ✓ courses");

    // GROUPS  (teacher_id YO'Q — group_assignments ishlatiladi)
    await client.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) NOT NULL UNIQUE,
        course_id  INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        qr_token   VARCHAR(255) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("  ✓ groups");

    // GROUP ASSIGNMENTS
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_assignments (
        id         SERIAL PRIMARY KEY,
        user_id    VARCHAR(10) NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
        group_id   INTEGER     NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (user_id, group_id)
      )
    `);
    console.log("  ✓ group_assignments");

    // STUDENTS
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
    console.log("  ✓ students");

    // ATTENDANCE — group_id NOT NULL emas, fkey alohida qo'shiladi
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id         SERIAL PRIMARY KEY,
        student_id VARCHAR(10) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        group_id   INTEGER,
        date       DATE        NOT NULL DEFAULT CURRENT_DATE,
        status     VARCHAR(20) NOT NULL DEFAULT 'present'
                   CHECK (status IN ('present','absent','late')),
        marked_by  VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL,
        scanned_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (student_id, date)
      )
    `);
    console.log("  ✓ attendance");

    // group_id foreign key — mavjud bo'lmasa qo'shamiz
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'attendance_group_id_fkey'
            AND table_name = 'attendance'
        ) THEN
          ALTER TABLE attendance
            ADD CONSTRAINT attendance_group_id_fkey
            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    console.log("  ✓ attendance fkey");

    // INDEXES
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_attendance_date    ON attendance(date)`,
      `CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id)`,
      `CREATE INDEX IF NOT EXISTS idx_attendance_group   ON attendance(group_id)`,
      `CREATE INDEX IF NOT EXISTS idx_students_group     ON students(group_id)`,
      `CREATE INDEX IF NOT EXISTS idx_assignments_user   ON group_assignments(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_assignments_group  ON group_assignments(group_id)`,
      `CREATE INDEX IF NOT EXISTS idx_groups_course      ON groups(course_id)`,
    ];
    for (const idx of indexes) await client.query(idx);
    console.log("  ✓ indexes");

    console.log("✅ Migration tugadi!");
  } catch (err) {
    console.error("❌ Migration xatosi:", err.message);
    if (process.env.NODE_ENV !== "production") throw err;
    console.warn("⚠️  Production: migration xatosi, server davom etmoqda...");
  } finally {
    if (client) client.release();
  }
}

module.exports = migrate;
