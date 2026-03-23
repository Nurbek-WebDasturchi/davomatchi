const pool = require('./pool');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  const client = await pool.connect();
  try {
    const check = await client.query("SELECT COUNT(*) FROM users");
    if (parseInt(check.rows[0].count) > 0) {
      console.log("ℹ️ Seed allaqachon qilingan");
      return;
    }

    console.log('🌱 Seed boshlanmoqda...');

    const hash = async (pw) => bcrypt.hash(pw, 10);

    // ─── Kurslar ───────────────────────────────────────
    await client.query(`
      INSERT INTO courses (name, year) VALUES
        ('Birinchi kurs', 1),
        ('Ikkinchi kurs', 2),
        ('Uchinchi kurs', 3)
      ON CONFLICT DO NOTHING
    `);
    const courses = await client.query('SELECT id FROM courses ORDER BY year');
    const [c1, c2, c3] = courses.rows.map(r => r.id);

    // ─── Director ──────────────────────────────────────
    await client.query(
      `INSERT INTO users (id, password, role, first_name, last_name) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      ['DR0001', await hash('director123'), 'director', 'Jasur', 'Karimov']
    );

    // ─── Deputy Director ───────────────────────────────
    await client.query(
      `INSERT INTO users (id, password, role, first_name, last_name) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      ['DP0001', await hash('deputy123'), 'deputy', 'Malika', 'Yusupova']
    );

    // ─── Attendance Manager ────────────────────────────
    await client.query(
      `INSERT INTO users (id, password, role, first_name, last_name) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      ['AM0001', await hash('manager123'), 'attendance_manager', 'Bobur', 'Toshmatov']
    );

    // ─── Guruhlar ──────────────────────────────────────
    await client.query(`
      INSERT INTO groups (name, course_id) VALUES
        ('IT-101', ${c1}), ('IT-102', ${c1}),
        ('IT-201', ${c2}), ('IT-202', ${c2}),
        ('IT-301', ${c3})
      ON CONFLICT DO NOTHING
    `);
    const groups = await client.query('SELECT id FROM groups ORDER BY id');
    const [g1, g2, g3, g4, g5] = groups.rows.map(r => r.id);

    // ─── Master/Curator ────────────────────────────────
    const teachers = [
      ['MA0001', 'master123', 'master',  'Aziz',   'Rahimov',   [g1, g2]],
      ['CU0001', 'curator123','curator', 'Nodira',  'Xasanova',  [g3]],
      ['CU0002', 'curator123','curator', 'Sherzod', 'Mirzayev',  [g4, g5]],
    ];

    for (const [id, pw, role, fn, ln, gids] of teachers) {
      await client.query(
        `INSERT INTO users (id, password, role, first_name, last_name) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [id, await hash(pw), role, fn, ln]
      );
      for (const gid of gids) {
        await client.query(
          `INSERT INTO group_assignments (user_id, group_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [id, gid]
        );
      }
    }

    // ─── Talabalar ─────────────────────────────────────
    const studentData = [
      // IT-101
      ['ST0001', 'Abdullayev', 'Jasur',    g1],
      ['ST0002', 'Karimova',   'Nilufar',  g1],
      ['ST0003', 'Toshmatov',  'Ulmas',    g1],
      ['ST0004', 'Yusupov',    'Sardor',   g1],
      ['ST0005', 'Mirzayeva',  'Dilnoza',  g1],
      // IT-102
      ['ST0006', 'Nazarova',   'Feruza',   g2],
      ['ST0007', 'Xasanov',    'Bekzod',   g2],
      ['ST0008', 'Umarov',     'Otabek',   g2],
      ['ST0009', 'Ergasheva',  'Kamola',   g2],
      // IT-201
      ['ST0010', 'Ismoilova',  'Zulfiya',  g3],
      ['ST0011', 'Qodirov',    'Mansur',   g3],
      ['ST0012', 'Haydarov',   'Islom',    g3],
      // IT-202
      ['ST0013', 'Mirzayev',   'Alisher',  g4],
      ['ST0014', 'Holmatova',  'Sabohat',  g4],
      ['ST0015', 'Yuldashev',  'Farrux',   g4],
      // IT-301
      ['ST0016', 'Botirov',    'Sunnat',   g5],
      ['ST0017', 'Murodova',   'Mahliyo',  g5],
      ['ST0018', 'Xoliqov',    'Nodir',    g5],
    ];

    const studentPw = await hash('student123');
    for (const [id, ln, fn, gid] of studentData) {
      await client.query(
        `INSERT INTO users (id, password, role, first_name, last_name) VALUES ($1,$2,'student',$3,$4) ON CONFLICT DO NOTHING`,
        [id, studentPw, fn, ln]
      );
      await client.query(
        `INSERT INTO students (id, group_id, student_code) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [id, gid, id]
      );
    }

    console.log('✅ Seed tugadi!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Login ma\'lumotlari:');
    console.log('  Director:    DR0001 / director123');
    console.log('  Deputy:      DP0001 / deputy123');
    console.log('  Att.Manager: AM0001 / manager123');
    console.log('  Master:      MA0001 / master123');
    console.log('  Curator:     CU0001 / curator123');
    console.log('  Student:     ST0001 / student123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (err) {
    console.error('❌ Seed xatosi:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = seed;
