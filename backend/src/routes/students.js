const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/students
// Talabalar ro'yxati
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { groupId, search } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    if (req.user.role === 'teacher') {
      params.push(req.user.group_id);
      where += ` AND s.group_id = $${params.length}`;
    } else if (groupId) {
      params.push(groupId);
      where += ` AND s.group_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      where += ` AND s.full_name ILIKE $${params.length}`;
    }

    const result = await pool.query(`
      SELECT s.id, s.full_name, s.student_code, s.phone,
             g.name AS group_name, c.name AS course_name
      FROM students s
      LEFT JOIN groups  g ON g.id = s.group_id
      LEFT JOIN courses c ON c.id = g.course_id
      ${where}
      ORDER BY s.full_name
    `, params);

    res.json({ students: result.rows, total: result.rows.length });
  } catch (err) {
    console.error('Students xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// POST /api/students
// Yangi talaba qo'shish (faqat admin)
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { fullName, groupId, studentCode, phone } = req.body;
    if (!fullName || !groupId) {
      return res.status(400).json({ error: 'Ism va guruh kerak' });
    }

    const result = await pool.query(
      'INSERT INTO students (full_name, group_id, student_code, phone) VALUES ($1,$2,$3,$4) RETURNING *',
      [fullName, groupId, studentCode || null, phone || null]
    );

    res.status(201).json({ student: result.rows[0] });
  } catch (err) {
    console.error('Create student xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// GET /api/students/:id
// Talaba tafsiloti (davomat tarixi bilan)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const student = await pool.query(`
      SELECT s.*, g.name AS group_name, c.name AS course_name
      FROM students s
      LEFT JOIN groups  g ON g.id = s.group_id
      LEFT JOIN courses c ON c.id = g.course_id
      WHERE s.id = $1
    `, [req.params.id]);

    if (student.rows.length === 0) {
      return res.status(404).json({ error: 'Talaba topilmadi' });
    }

    if (req.user.role === 'teacher' && student.rows[0].group_id !== req.user.group_id) {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }

    const history = await pool.query(`
      SELECT date, status, scanned_at
      FROM attendance
      WHERE student_id = $1
      ORDER BY date DESC
      LIMIT 30
    `, [req.params.id]);

    const stats = await pool.query(`
      SELECT
        COUNT(*) AS total_days,
        COUNT(CASE WHEN status = 'present' THEN 1 END) AS present_days,
        ROUND(
          COUNT(CASE WHEN status='present' THEN 1 END)::decimal
          / NULLIF(COUNT(*),0) * 100, 1
        ) AS rate
      FROM attendance
      WHERE student_id = $1
        AND date >= CURRENT_DATE - INTERVAL '30 days'
    `, [req.params.id]);

    res.json({
      student: student.rows[0],
      history: history.rows,
      stats: stats.rows[0],
    });
  } catch (err) {
    console.error('Student detail xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

module.exports = router;
