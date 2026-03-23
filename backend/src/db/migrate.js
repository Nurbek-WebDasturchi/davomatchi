const pool = require('./pool');
require('dotenv').config();

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Migration boshlanmoqda...');

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

    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) NOT NULL,
        year       INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) NOT NULL,
        course_id  INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        qr_token   VARCHAR(255) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS group_assignments (
        id       SERIAL PRIMARY KEY,
        user_id  VARCHAR(10) REFERENCES users(id) ON DELETE CASCADE,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        UNIQUE (user_id, group_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id           VARCHAR(10) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        group_id     INTEGER REFERENCES groups(id) ON DELETE SET NULL,
        student_code VARCHAR(50) UNIQUE,
        phone        VARCHAR(20),
        created_at   TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id         SERIAL PRIMARY KEY,
        student_id VARCHAR(10) REFERENCES students(id) ON DELETE CASCADE,
        group_id   INTEGER REFERENCES groups(id) ON DELETE SET NULL,
        date       DATE NOT NULL DEFAULT CURRENT_DATE,
        status     VARCHAR(20) NOT NULL DEFAULT 'present'
                   CHECK (status IN ('present', 'absent', 'late')),
        marked_by  VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL,
        scanned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (student_id, date)
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_attendance_date    ON attendance(date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_students_group     ON students(group_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assignments_user   ON group_assignments(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assignments_group  ON group_assignments(group_id)`);

    console.log('✅ Migration tugadi!');
  } catch (err) {
    console.error('❌ Migration xatosi:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = migrate;
