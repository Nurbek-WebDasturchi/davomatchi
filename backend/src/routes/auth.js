const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const { authMiddleware } = require("../middleware/auth");

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ error: "ID va parol kerak" });
    }

    // ✅ pgcrypto crypt() bilan tekshiruv — barcha userlar uchun
    const result = await pool.query(
      `SELECT id, role, first_name, last_name
       FROM users
       WHERE id = $1 AND password = crypt($2, password)`,
      [userId.toUpperCase().trim(), password],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "ID yoki parol noto'g'ri" });
    }

    const user = result.rows[0];

    // Token yaratish (7 kun)
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    });
  } catch (err) {
    console.error("Login xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = req.user;

    // Student bo'lsa guruhini ham olib kelish
    let groupInfo = null;
    if (user.role === "student") {
      const sg = await pool.query(
        `SELECT g.id, g.name, c.name AS course_name
         FROM students s
         JOIN groups g ON g.id = s.group_id
         JOIN courses c ON c.id = g.course_id
         WHERE s.id = $1`,
        [user.id],
      );
      groupInfo = sg.rows[0] || null;
    }

    // Master/Curator bo'lsa guruhlarini olib kelish
    let assignedGroups = [];
    if (["master", "curator"].includes(user.role)) {
      const ag = await pool.query(
        `SELECT g.id, g.name, c.name AS course_name
         FROM group_assignments ga
         JOIN groups g ON g.id = ga.group_id
         JOIN courses c ON c.id = g.course_id
         WHERE ga.user_id = $1`,
        [user.id],
      );
      assignedGroups = ag.rows;
    }

    res.json({
      user: {
        id: user.id,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        groupInfo,
        assignedGroups,
      },
    });
  } catch (err) {
    console.error("Me xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// POST /api/auth/change-password
router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Eski va yangi parol kerak" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Parol kamida 6 ta belgi" });
    }

    // ✅ Eski parolni pgcrypto crypt() bilan tekshirish
    const result = await pool.query(
      `SELECT id FROM users WHERE id = $1 AND password = crypt($2, password)`,
      [req.user.id, oldPassword],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Eski parol noto'g'ri" });
    }

    // ✅ Yangi parolni pgcrypto crypt() bilan saqlash
    await pool.query(
      `UPDATE users SET password = crypt($1, gen_salt('bf')), updated_at = NOW() WHERE id = $2`,
      [newPassword, req.user.id],
    );

    res.json({ message: "Parol muvaffaqiyatli o'zgartirildi" });
  } catch (err) {
    console.error("Change password xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
