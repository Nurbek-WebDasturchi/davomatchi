const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware, requireRole } = require('../middleware/auth');

// POST /api/attendance/scan
// Talaba QR kodni skanerlaydi (token shart emas — ochiq endpoint)
router.post('/scan', async (req, res) => {
  try {
    const { qrToken, studentId } = req.body;

    if (!qrToken || !studentId) {
      return res.status(400).json({ error: 'qrToken va studentId kerak' });
    }

    // Guruhni QR token orqali topish
    const groupRes = await pool.query(
      'SELECT id, name FROM groups WHERE qr_token = $1',
      [qrToken]
    );
    if (groupRes.rows.length === 0) {
      return res.status(404).json({ error: "Noto'g'ri QR kod" });
    }
    const group = groupRes.rows[0];

    // Talabani topish
    const studentRes = await pool.query(
      'SELECT id, full_name, group_id FROM students WHERE id = $1',
      [studentId]
    );
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Talaba topilmadi' });
    }
    const student = studentRes.rows[0];

    // Talaba bu guruhga tegishli ekanligini tekshirish
    if (student.group_id !== group.id) {
      return res.status(400).json({
        error: "Bu QR kod sizning guruhingizga tegishli emas"
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Takroriy skanerlashni tekshirish
    const existing = await pool.query(
      'SELECT id, scanned_at FROM attendance WHERE student_id = $1 AND date = $2',
      [studentId, today]
    );

    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        alreadyMarked: true,
        message: 'Siz bugun allaqachon davomat belgilagansiz',
        attendance: {
          studentName: student.full_name,
          groupName: group.name,
          scannedAt: existing.rows[0].scanned_at,
        }
      });
    }

    // Davomatni belgilash
    const att = await pool.query(
      `INSERT INTO attendance (student_id, group_id, date, status, scanned_at)
       VALUES ($1, $2, $3, 'present', NOW())
       RETURNING scanned_at`,
      [studentId, group.id, today]
    );

    res.json({
      success: true,
      alreadyMarked: false,
      message: 'Davomat muvaffaqiyatli belgilandi!',
      attendance: {
        studentName: student.full_name,
        groupName: group.name,
        scannedAt: att.rows[0].scanned_at,
      }
    });
  } catch (err) {
    console.error('Scan xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// GET /api/attendance/today
// Bugungi umumiy statistika (faqat admin)
router.get('/today', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const byCourse = await pool.query(`
      SELECT
        c.id   AS course_id,
        c.name AS course_name,
        c.year,
        COUNT(DISTINCT s.id)          AS total_students,
        COUNT(DISTINCT a.student_id)  AS present_count
      FROM courses c
      LEFT JOIN groups   g ON g.course_id = c.id
      LEFT JOIN students s ON s.group_id  = g.id
      LEFT JOIN attendance a
             ON a.student_id = s.id AND a.date = $1
      GROUP BY c.id, c.name, c.year
      ORDER BY c.year
    `, [today]);

    const totals = await pool.query(`
      SELECT
        COUNT(DISTINCT s.id)         AS total_students,
        COUNT(DISTINCT a.student_id) AS present_today
      FROM students s
      LEFT JOIN attendance a
             ON a.student_id = s.id AND a.date = $1
    `, [today]);

    res.json({
      date: today,
      totals: totals.rows[0],
      byCourse: byCourse.rows,
    });
  } catch (err) {
    console.error('Today xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// GET /api/attendance/group/:groupId
// Guruh davomati (admin yoki o'z guruhi bo'lgan o'qituvchi)
router.get('/group/:groupId', authMiddleware, async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // O'qituvchi faqat o'z guruhini ko'ra oladi
    if (req.user.role === 'teacher' && req.user.group_id !== groupId) {
      return res.status(403).json({ error: "Bu guruhga ruxsatingiz yo'q" });
    }

    const groupInfo = await pool.query(`
      SELECT g.id, g.name, g.qr_token,
             c.name AS course_name, c.year,
             u.full_name AS teacher_name
      FROM groups g
      LEFT JOIN courses c ON c.id = g.course_id
      LEFT JOIN users   u ON u.id = g.teacher_id
      WHERE g.id = $1
    `, [groupId]);

    if (groupInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Guruh topilmadi' });
    }

    const students = await pool.query(`
      SELECT
        s.id, s.full_name, s.student_code,
        CASE WHEN a.id IS NOT NULL THEN true ELSE false END AS is_present,
        a.scanned_at,
        a.status
      FROM students s
      LEFT JOIN attendance a
             ON a.student_id = s.id AND a.date = $1
      WHERE s.group_id = $2
      ORDER BY is_present DESC, s.full_name
    `, [date, groupId]);

    const presentCount = students.rows.filter(s => s.is_present).length;

    res.json({
      group: groupInfo.rows[0],
      date,
      totalStudents: students.rows.length,
      presentCount,
      students: students.rows,
    });
  } catch (err) {
    console.error('Group attendance xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// GET /api/attendance/course/:courseId/groups
// Kurs guruhlarining davomati (faqat admin)
router.get('/course/:courseId/groups', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const groups = await pool.query(`
      SELECT
        g.id, g.name, g.qr_token,
        u.full_name AS teacher_name,
        COUNT(DISTINCT s.id)         AS total_students,
        COUNT(DISTINCT a.student_id) AS present_count
      FROM groups g
      LEFT JOIN users      u ON u.id = g.teacher_id
      LEFT JOIN students   s ON s.group_id = g.id
      LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
      WHERE g.course_id = $2
      GROUP BY g.id, g.name, g.qr_token, u.full_name
      ORDER BY g.name
    `, [today, req.params.courseId]);

    res.json({ groups: groups.rows, date: today });
  } catch (err) {
    console.error('Course groups xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// GET /api/attendance/analytics
// Haftalik / oylik tahlil
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    const period = req.query.period === 'month' ? 30 : 7;

    let whereExtra = '';
    const params = [period];

    if (req.user.role === 'teacher') {
      params.push(req.user.group_id);
      whereExtra = `AND g.id = $${params.length}`;
    } else if (req.query.groupId) {
      params.push(req.query.groupId);
      whereExtra = `AND g.id = $${params.length}`;
    }

    const rows = await pool.query(`
      SELECT
        a.date,
        COUNT(DISTINCT a.student_id) AS present_count,
        COUNT(DISTINCT s.id)         AS total_students
      FROM attendance a
      JOIN students s ON s.id  = a.student_id
      JOIN groups   g ON g.id  = s.group_id
      WHERE a.date >= CURRENT_DATE - ($1 || ' days')::interval
      ${whereExtra}
      GROUP BY a.date
      ORDER BY a.date
    `, params);

    res.json({ analytics: rows.rows, period });
  } catch (err) {
    console.error('Analytics xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// GET /api/attendance/export
// Excel uchun ma'lumot (faqat admin)
router.get('/export', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const end   = req.query.endDate   || new Date().toISOString().split('T')[0];
    const start = req.query.startDate || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const params = [start, end];
    let groupFilter = '';
    if (req.query.groupId) {
      params.push(req.query.groupId);
      groupFilter = `AND g.id = $${params.length}`;
    }

    const result = await pool.query(`
      SELECT
        s.full_name    AS "Talaba ismi",
        s.student_code AS "Talaba kodi",
        g.name         AS "Guruh",
        c.name         AS "Kurs",
        a.date         AS "Sana",
        a.status       AS "Holat",
        TO_CHAR(a.scanned_at, 'HH24:MI') AS "Vaqt"
      FROM attendance a
      JOIN students s ON s.id  = a.student_id
      JOIN groups   g ON g.id  = a.group_id
      JOIN courses  c ON c.id  = g.course_id
      WHERE a.date BETWEEN $1 AND $2
      ${groupFilter}
      ORDER BY a.date, g.name, s.full_name
    `, params);

    res.json({ data: result.rows, count: result.rows.length, startDate: start, endDate: end });
  } catch (err) {
    console.error('Export xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

module.exports = router;
