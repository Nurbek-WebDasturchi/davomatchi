const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// GET /api/users — Barcha foydalanuvchilar (director/deputy)
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { role, search } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (role) {
      params.push(role);
      where += ` AND u.role = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.id ILIKE $${params.length})`;
    }

    const result = await pool.query(`
      SELECT u.id, u.role, u.first_name, u.last_name, u.created_at
      FROM users u
      ${where}
      ORDER BY u.role, u.last_name
    `, params);

    res.json({ users: result.rows, total: result.rows.length });
  } catch (err) {
    console.error('Users xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// POST /api/users — Yangi foydalanuvchi qo'shish
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id, password, role, firstName, lastName, groupIds } = req.body;

    if (!id || !password || !role || !firstName || !lastName) {
      return res.status(400).json({ error: "Barcha maydonlar to'ldirilishi kerak" });
    }

    const validRoles = ['student', 'master', 'curator', 'director', 'deputy', 'attendance_manager'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Noto'g'ri rol" });
    }

    if (id.length < 4 || id.length > 10) {
      return res.status(400).json({ error: 'ID 4-10 belgi orasida bo\'lishi kerak' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE id = $1', [id.toUpperCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Bu ID allaqachon mavjud' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (id, password, role, first_name, last_name) VALUES ($1,$2,$3,$4,$5)',
      [id.toUpperCase(), hashed, role, firstName, lastName]
    );

    // Student bo'lsa students jadvaliga ham qo'shish
    if (role === 'student' && groupIds?.[0]) {
      await pool.query(
        'INSERT INTO students (id, group_id, student_code) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
        [id.toUpperCase(), groupIds[0], id.toUpperCase()]
      );
    }

    // Master/Curator bo'lsa guruhlarini biriktirish
    if (['master', 'curator'].includes(role) && groupIds?.length > 0) {
      for (const gid of groupIds) {
        await pool.query(
          'INSERT INTO group_assignments (user_id, group_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [id.toUpperCase(), gid]
        );
      }
    }

    res.status(201).json({ message: "Foydalanuvchi muvaffaqiyatli qo'shildi", id: id.toUpperCase() });
  } catch (err) {
    console.error('Create user xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: "Foydalanuvchi o'chirildi" });
  } catch (err) {
    console.error('Delete user xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// PUT /api/users/:id/reset-password
router.put('/:id/reset-password', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Parol kamida 6 ta belgi' });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.params.id]);
    res.json({ message: 'Parol yangilandi' });
  } catch (err) {
    console.error('Reset password xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

module.exports = router;
