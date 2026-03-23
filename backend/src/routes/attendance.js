const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware, requireAdmin, ROLES } = require('../middleware/auth');

// POST /api/attendance/scan — QR kod (barcha login qilganlar)
router.post('/scan', authMiddleware, async (req, res) => {
  try {
    const { qrToken, studentId } = req.body;
    if (!qrToken || !studentId) {
      return res.status(400).json({ error: 'qrToken va studentId kerak' });
    }

    const groupRes = await pool.query('SELECT id, name FROM groups WHERE qr_token = $1', [qrToken]);
    if (groupRes.rows.length === 0) {
      return res.status(404).json({ error: "Noto'g'ri QR kod" });
    }
    const group = groupRes.rows[0];

    const studentRes = await pool.query(
      `SELECT s.id, u.first_name, u.last_name, s.group_id
       FROM students s JOIN users u ON u.id = s.id WHERE s.id = $1`,
      [studentId]
    );
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Talaba topilmadi' });
    }
    const student = studentRes.rows[0];

    if (student.group_id !== group.id) {
      return res.status(400).json({ error: "Bu QR kod sizning guruhingizga tegishli emas" });
    }

    const today = new Date().toISOString().split('T')[0];
    const existing = await pool.query(
      'SELECT id, scanned_at FROM attendance WHERE student_id = $1 AND date = $2',
      [studentId, today]
    );

    if (existing.rows.length > 0) {
      return res.json({
        success: true, alreadyMarked: true,
        message: 'Bugun allaqachon belgilangan',
        attendance: {
          studentName: `${student.first_name} ${student.last_name}`,
          groupName: group.name,
          scannedAt: existing.rows[0].scanned_at,
        }
      });
    }

    const att = await pool.query(
      `INSERT INTO attendance (student_id, group_id, date, status, marked_by, scanned_at)
       VALUES ($1, $2, $3, 'present', $4, NOW()) RETURNING scanned_at`,
      [studentId, group.id, today, req.user.id]
    );

    res.json({
      success: true, alreadyMarked: false,
      message: 'Davomat muvaffaqiyatli belgilandi!',
      attendance: {
        studentName: `${student.first_name} ${student.last_name}`,
        groupName: group.name,
        scannedAt: att.rows[0].scanned_at,
      }
    });
  } catch (err) {
    console.error('Scan xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// POST /api/attendance/manual — Qo'lda belgilash (FAQAT davomatchi)
router.post('/manual', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'attendance_manager') {
      return res.status(403).json({ error: "Faqat davomatchi uchun" });
    }

    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'Talaba ID kerak' });
    }

    const studentRes = await pool.query(
      `SELECT s.id, u.first_name, u.last_name, s.group_id, g.name AS group_name
       FROM students s
       JOIN users u ON u.id = s.id
       LEFT JOIN groups g ON g.id = s.group_id
       WHERE s.id = $1`,
      [studentId.toUpperCase().trim()]
    );

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Talaba topilmadi. ID ni tekshiring.' });
    }
    const student = studentRes.rows[0];

    const today = new Date().toISOString().split('T')[0];
    const existing = await pool.query(
      'SELECT id, scanned_at FROM attendance WHERE student_id = $1 AND date = $2',
      [student.id, today]
    );

    if (existing.rows.length > 0) {
      return res.json({
        success: true, alreadyMarked: true,
        message: 'Bu talaba bugun allaqachon belgilangan',
        student: {
          id: student.id,
          name: `${student.first_name} ${student.last_name}`,
          groupName: student.group_name,
          scannedAt: existing.rows[0].scanned_at,
        }
      });
    }

    const att = await pool.query(
      `INSERT INTO attendance (student_id, group_id, date, status, marked_by, scanned_at)
       VALUES ($1, $2, $3, 'present', $4, NOW()) RETURNING scanned_at`,
      [student.id, student.group_id, today, req.user.id]
    );

    res.json({
      success: true, alreadyMarked: false,
      message: 'Davomat muvaffaqiyatli belgilandi!',
      student: {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        groupName: student.group_name,
        scannedAt: att.rows[0].scanned_at,
      }
    });
  } catch (err) {
    console.error('Manual attendance xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// GET /api/attendance/today — Bugungi statistika (director, deputy)
router.get('/today', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const byCourse = await pool.query(`
      SELECT c.id AS course_id, c.name AS course_name, c.year,
             COUNT(DISTINCT s.id)         AS total_students,
             COUNT(DISTINCT a.student_id) AS present_count
      FROM courses c
      LEFT JOIN groups   g ON g.course_id = c.id
      LEFT JOIN students s ON s.group_id  = g.id
      LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
      GROUP BY c.id, c.name, c.year ORDER BY c.year
    `, [today]);

    const totals = await pool.query(`
      SELECT COUNT(DISTINCT s.id)         AS total_students,
             COUNT(DISTINCT a.student_id) AS present_today
      FROM students s
      LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
    `, [today]);

    res.json({ date: today, totals: totals.rows[0], byCourse: byCourse.rows });
  } catch (err) {
    console.error('Today xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// GET /api/attendance/all-groups — Davomatchi va admin uchun barcha guruhlar
router.get('/all-groups', authMiddleware, async (req, res) => {
  try {
    const allowed = ['attendance_manager', 'director', 'deputy'];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }

    const today = new Date().toISOString().split('T')[0];

    const groups = await pool.query(`
      SELECT g.id, g.name, c.name AS course_name,
             COUNT(DISTINCT s.id)         AS total_students,
             COUNT(DISTINCT a.student_id) AS present_count
      FROM groups g
      LEFT JOIN courses c    ON c.id = g.course_id
      LEFT JOIN students s   ON s.group_id = g.id
      LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
      GROUP BY g.id, g.name, c.name
      ORDER BY c.name, g.name
    `, [today]);

    res.json({ groups: groups.rows, date: today });
  } catch (err) {
    console.error('All groups xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// GET /api/attendance/group/:groupId — Guruh davomati
router.get('/group/:groupId', authMiddleware, async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const user = req.user;

    // Master/Curator faqat o'z guruhini ko'radi
    if (ROLES.TEACHER.includes(user.role)) {
      const assigned = await pool.query(
        'SELECT group_id FROM group_assignments WHERE user_id = $1 AND group_id = $2',
        [user.id, groupId]
      );
      if (assigned.rows.length === 0) {
        return res.status(403).json({ error: "Bu guruhga ruxsatingiz yo'q" });
      }
    } else if (!['director', 'deputy', 'attendance_manager'].includes(user.role)) {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }

    const groupInfo = await pool.query(`
      SELECT g.id, g.name, g.qr_token, c.name AS course_name
      FROM groups g LEFT JOIN courses c ON c.id = g.course_id
      WHERE g.id = $1
    `, [groupId]);

    if (groupInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Guruh topilmadi' });
    }

    const students = await pool.query(`
      SELECT s.id, u.first_name, u.last_name, s.student_code,
             CASE WHEN a.id IS NOT NULL THEN true ELSE false END AS is_present,
             a.scanned_at, a.status
      FROM students s
      JOIN users u ON u.id = s.id
      LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
      WHERE s.group_id = $2
      ORDER BY is_present DESC, u.last_name
    `, [date, groupId]);

    const presentCount = students.rows.filter(s => s.is_present).length;

    res.json({
      group: groupInfo.rows[0],
      date, totalStudents: students.rows.length,
      presentCount, students: students.rows,
    });
  } catch (err) {
    console.error('Group attendance xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// GET /api/attendance/my-groups — Master/Curator o'z guruhlari
router.get('/my-groups', authMiddleware, async (req, res) => {
  try {
    if (!ROLES.TEACHER.includes(req.user.role)) {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }

    const today = new Date().toISOString().split('T')[0];

    const groups = await pool.query(`
      SELECT g.id, g.name, c.name AS course_name,
             COUNT(DISTINCT s.id)         AS total_students,
             COUNT(DISTINCT a.student_id) AS present_count
      FROM group_assignments ga
      JOIN groups g ON g.id = ga.group_id
      LEFT JOIN courses c    ON c.id = g.course_id
      LEFT JOIN students s   ON s.group_id = g.id
      LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
      WHERE ga.user_id = $2
      GROUP BY g.id, g.name, c.name ORDER BY g.name
    `, [today, req.user.id]);

    res.json({ groups: groups.rows, date: today });
  } catch (err) {
    console.error('My groups xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// GET /api/attendance/course/:courseId/groups
router.get('/course/:courseId/groups', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const groups = await pool.query(`
      SELECT g.id, g.name, g.qr_token,
             COUNT(DISTINCT s.id)         AS total_students,
             COUNT(DISTINCT a.student_id) AS present_count
      FROM groups g
      LEFT JOIN students   s ON s.group_id = g.id
      LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
      WHERE g.course_id = $2
      GROUP BY g.id, g.name, g.qr_token ORDER BY g.name
    `, [today, req.params.courseId]);

    res.json({ groups: groups.rows, date: today });
  } catch (err) {
    console.error('Course groups xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// GET /api/attendance/analytics
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    const period = req.query.period === 'month' ? 30 : 7;
    const user = req.user;
    let whereExtra = '';
    const params = [period];

    if (ROLES.TEACHER.includes(user.role)) {
      params.push(user.id);
      whereExtra = `AND ga.user_id = $${params.length}`;
    } else if (req.query.groupId) {
      params.push(req.query.groupId);
      whereExtra = `AND g.id = $${params.length}`;
    }

    const rows = await pool.query(`
      SELECT a.date,
             COUNT(DISTINCT a.student_id) AS present_count,
             COUNT(DISTINCT s.id)         AS total_students
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      JOIN groups   g ON g.id = s.group_id
      ${ROLES.TEACHER.includes(user.role) ? 'JOIN group_assignments ga ON ga.group_id = g.id' : ''}
      WHERE a.date >= CURRENT_DATE - ($1 || ' days')::interval
      ${whereExtra}
      GROUP BY a.date ORDER BY a.date
    `, params);

    res.json({ analytics: rows.rows, period });
  } catch (err) {
    console.error('Analytics xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// GET /api/attendance/export
router.get('/export', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const end   = req.query.endDate   || new Date().toISOString().split('T')[0];
    const start = req.query.startDate || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT u.last_name || ' ' || u.first_name AS "Talaba ismi",
             s.student_code AS "Talaba kodi", g.name AS "Guruh",
             c.name AS "Kurs", a.date AS "Sana", a.status AS "Holat",
             TO_CHAR(a.scanned_at, 'HH24:MI') AS "Vaqt"
      FROM attendance a
      JOIN students s ON s.id  = a.student_id
      JOIN users    u ON u.id  = s.id
      JOIN groups   g ON g.id  = a.group_id
      JOIN courses  c ON c.id  = g.course_id
      WHERE a.date BETWEEN $1 AND $2
      ORDER BY a.date, g.name, u.last_name
    `, [start, end]);

    res.json({ data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('Export xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

module.exports = router;
