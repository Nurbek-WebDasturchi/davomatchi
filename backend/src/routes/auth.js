const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

// POST /api/auth/telegram
// Telegram WebApp orqali kirish
router.post('/telegram', async (req, res) => {
  try {
    const { telegramId, fullName, username } = req.body;

    if (!telegramId) {
      return res.status(400).json({ error: 'Telegram ID kerak' });
    }

    // Foydalanuvchini bazada qidirish
    const result = await pool.query(
      'SELECT id, telegram_id, full_name, role, group_id FROM users WHERE telegram_id = $1',
      [telegramId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Siz tizimda ro'yxatdan o'tilmagan. Administrator bilan bog'laning.",
        code: 'USER_NOT_FOUND'
      });
    }

    const user = result.rows[0];

    // Ismini yangilash
    await pool.query(
      'UPDATE users SET full_name = $1, username = $2, updated_at = NOW() WHERE id = $3',
      [fullName || user.full_name, username || null, user.id]
    );

    // JWT token yaratish (7 kun)
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        telegramId: user.telegram_id,
        fullName: fullName || user.full_name,
        role: user.role,
        groupId: user.group_id,
      }
    });
  } catch (err) {
    console.error('Auth xatosi:', err.message);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// GET /api/auth/me
// Joriy foydalanuvchi ma'lumoti
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
