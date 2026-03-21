const pool = require('./pool');
require('dotenv').config();

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seed ma\'lumotlar kiritilmoqda...');

    // ─── Kurslar ───────────────────────────────────────
    const cRes = await client.query(`
      INSERT INTO courses (name, year) VALUES
        ('Birinchi kurs', 1),
        ('Ikkinchi kurs', 2),
        ('Uchinchi kurs', 3)
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);

    // Agar allaqachon mavjud bo'lsa, qayta olamiz
    const cAll = await client.query('SELECT id FROM courses ORDER BY year');
    const [c1, c2, c3] = cAll.rows.map(r => r.id);
    console.log('✅ Kurslar tayyor');

    // ─── Admin foydalanuvchi ───────────────────────────
    // !!! BU YERGA O'Z TELEGRAM ID'INGIZNI YOZING !!!
    await client.query(`
      INSERT INTO users (telegram_id, full_name, username, role)
      VALUES (123456789, 'Administrator', 'admin_user', 'admin')
      ON CONFLICT (telegram_id) DO NOTHING;
    `);

    // ─── O'qituvchilar ─────────────────────────────────
    // !!! BU YERGA O'QITUVCHILARNING TELEGRAM ID'LARINI YOZING !!!
    await client.query(`
      INSERT INTO users (telegram_id, full_name, username, role) VALUES
        (111111111, 'Aziz Karimov',    'aziz_teacher',   'teacher'),
        (222222222, 'Malika Yusupova', 'malika_teacher',  'teacher'),
        (333333333, 'Bobur Toshmatov', 'bobur_teacher',   'teacher')
      ON CONFLICT (telegram_id) DO NOTHING;
    `);

    const teachers = await client.query(
      'SELECT id, telegram_id FROM users WHERE role = $1 ORDER BY id',
      ['teacher']
    );
    const [t1, t2, t3] = teachers.rows.map(r => r.id);
    console.log('✅ Foydalanuvchilar tayyor');

    // ─── Guruhlar ──────────────────────────────────────
    await client.query(`
      INSERT INTO groups (name, course_id, teacher_id) VALUES
        ('IT-101', ${c1}, ${t1}),
        ('IT-102', ${c1}, ${t2}),
        ('IT-201', ${c2}, ${t3}),
        ('IT-202', ${c2}, ${t1}),
        ('IT-301', ${c3}, ${t2})
      ON CONFLICT DO NOTHING;
    `);

    const groups = await client.query('SELECT id, name FROM groups ORDER BY id');
    const [g1, g2, g3, g4, g5] = groups.rows.map(r => r.id);

    // O'qituvchilarga guruh biriktirish
    await client.query(`UPDATE users SET group_id = ${g1} WHERE telegram_id = 111111111`);
    await client.query(`UPDATE users SET group_id = ${g2} WHERE telegram_id = 222222222`);
    await client.query(`UPDATE users SET group_id = ${g3} WHERE telegram_id = 333333333`);
    console.log('✅ Guruhlar tayyor');

    // ─── Talabalar ─────────────────────────────────────
    const students = [
      // IT-101 (g1)
      ['Abdullayev Jasur',    g1, 'STD-10001'],
      ['Karimova Nilufar',    g1, 'STD-10002'],
      ['Toshmatov Ulmas',     g1, 'STD-10003'],
      ['Yusupov Sardor',      g1, 'STD-10004'],
      ['Mirzayeva Dilnoza',   g1, 'STD-10005'],
      ['Rahimov Temur',       g1, 'STD-10006'],
      // IT-102 (g2)
      ['Nazarova Feruza',     g2, 'STD-10007'],
      ['Xasanov Bekzod',      g2, 'STD-10008'],
      ['Umarov Otabek',       g2, 'STD-10009'],
      ['Ergasheva Kamola',    g2, 'STD-10010'],
      ['Sobirov Sherzod',     g2, 'STD-10011'],
      // IT-201 (g3)
      ['Ismoilova Zulfiya',   g3, 'STD-10012'],
      ['Qodirov Mansur',      g3, 'STD-10013'],
      ['Haydarov Islom',      g3, 'STD-10014'],
      ['Tursunova Barno',     g3, 'STD-10015'],
      ['Normatov Doniyor',    g3, 'STD-10016'],
      // IT-202 (g4)
      ['Mirzayev Alisher',    g4, 'STD-10017'],
      ['Holmatova Sabohat',   g4, 'STD-10018'],
      ['Yuldashev Farrux',    g4, 'STD-10019'],
      ['Qosimova Hulkar',     g4, 'STD-10020'],
      // IT-301 (g5)
      ['Botirov Sunnat',      g5, 'STD-10021'],
      ['Murodova Mahliyo',    g5, 'STD-10022'],
      ['Xoliqov Nodir',       g5, 'STD-10023'],
      ['Davlatova Saodat',    g5, 'STD-10024'],
    ];

    for (const [name, gid, code] of students) {
      await client.query(
        'INSERT INTO students (full_name, group_id, student_code) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [name, gid, code]
      );
    }
    console.log('✅ Talabalar tayyor');

    // ─── Namuna davomat (bugun va kecha) ───────────────
    const allStudents = await client.query('SELECT id, group_id FROM students');

    for (const s of allStudents.rows.slice(0, 14)) {
      await client.query(`
        INSERT INTO attendance (student_id, group_id, date, status)
        VALUES ($1, $2, CURRENT_DATE, 'present')
        ON CONFLICT DO NOTHING
      `, [s.id, s.group_id]);
    }

    for (const s of allStudents.rows.slice(0, 18)) {
      await client.query(`
        INSERT INTO attendance (student_id, group_id, date, status)
        VALUES ($1, $2, CURRENT_DATE - 1, 'present')
        ON CONFLICT DO NOTHING
      `, [s.id, s.group_id]);
    }
    console.log('✅ Namuna davomat tayyor');

    console.log('\n🎉 Seed muvaffaqiyatli tugadi!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  MUHIM: seed.js dagi telegram_id larni');
    console.log('   o\'z haqiqiy Telegram ID laringizga almashtiring!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (err) {
    console.error('❌ Seed xatosi:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
