const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const pool = require("../db/pool");
const { authMiddleware, requireAdmin, ROLES } = require("../middleware/auth");

// GET /api/users
router.get("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { role, search } = req.query;
    const params = [];
    let where = "WHERE 1=1";

    if (role) {
      params.push(role);
      where += ` AND u.role = $${params.length}`;
    }
    if (search) {
      params.push(`%${search.trim()}%`);
      where += ` AND (u.first_name ILIKE $${params.length}
                   OR u.last_name  ILIKE $${params.length}
                   OR u.id         ILIKE $${params.length})`;
    }

    const result = await pool.query(
      `SELECT u.id, u.role, u.first_name, u.last_name, u.created_at,
              -- Master/Curator uchun guruhlarini ham ko'rsatamiz
              ARRAY_AGG(DISTINCT ga.group_id) FILTER (WHERE ga.group_id IS NOT NULL) AS group_ids
       FROM users u
       LEFT JOIN group_assignments ga ON ga.user_id = u.id
       ${where}
       GROUP BY u.id, u.role, u.first_name, u.last_name, u.created_at
       ORDER BY u.role, u.last_name`,
      params,
    );

    res.json({ users: result.rows, total: result.rows.length });
  } catch (err) {
    console.error("Users xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// GET /api/users/:id
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const targetId = req.params.id.toUpperCase();

    // Faqat admin yoki o'zi ko'ra oladi
    if (!ROLES.ADMIN.includes(req.user.role) && req.user.id !== targetId) {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }

    const userRes = await pool.query(
      `SELECT id, role, first_name, last_name, created_at FROM users WHERE id = $1`,
      [targetId],
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    const user = userRes.rows[0];

    // Agar master/curator bo'lsa guruhlarini ham olib kelish
    let assignedGroups = [];
    if (ROLES.TEACHER.includes(user.role)) {
      const ag = await pool.query(
        `SELECT g.id, g.name, c.name AS course_name
         FROM group_assignments ga
         JOIN groups  g ON g.id  = ga.group_id
         JOIN courses c ON c.id  = g.course_id
         WHERE ga.user_id = $1`,
        [targetId],
      );
      assignedGroups = ag.rows;
    }

    // Agar student bo'lsa guruhini olib kelish
    let groupInfo = null;
    if (user.role === "student") {
      const sg = await pool.query(
        `SELECT g.id, g.name, c.name AS course_name
         FROM students s
         JOIN groups  g ON g.id = s.group_id
         JOIN courses c ON c.id = g.course_id
         WHERE s.id = $1`,
        [targetId],
      );
      groupInfo = sg.rows[0] || null;
    }

    res.json({ user: { ...user, assignedGroups, groupInfo } });
  } catch (err) {
    console.error("User detail xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// POST /api/users  — Yangi foydalanuvchi qo'shish (faqat director/deputy)
router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id, password, role, firstName, lastName, groupIds } = req.body;

    if (!id || !password || !role || !firstName || !lastName) {
      return res
        .status(400)
        .json({ error: "Barcha maydonlar to'ldirilishi kerak" });
    }

    const validRoles = [
      "student",
      "master",
      "curator",
      "director",
      "deputy",
      "attendance_manager",
    ];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Noto'g'ri rol" });
    }

    const upperid = id.toUpperCase().trim();

    if (upperid.length < 4 || upperid.length > 10) {
      return res
        .status(400)
        .json({ error: "ID 4-10 belgi orasida bo'lishi kerak" });
    }

    const existing = await pool.query("SELECT id FROM users WHERE id = $1", [
      upperid,
    ]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Bu ID allaqachon mavjud" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (id, password, role, first_name, last_name) VALUES ($1,$2,$3,$4,$5)",
      [upperid, hashed, role, firstName.trim(), lastName.trim()],
    );

    // Student bo'lsa students jadvaliga qo'shish
    if (role === "student") {
      const gid = groupIds?.[0] ? parseInt(groupIds[0]) : null;
      await pool.query(
        `INSERT INTO students (id, group_id, student_code)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [upperid, gid, upperid],
      );
    }

    // Master/Curator bo'lsa guruhlarini biriktirish
    if (ROLES.TEACHER.includes(role) && groupIds?.length > 0) {
      for (const gid of groupIds) {
        await pool.query(
          `INSERT INTO group_assignments (user_id, group_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [upperid, parseInt(gid)],
        );
      }
    }

    res.status(201).json({
      message: "Foydalanuvchi muvaffaqiyatli qo'shildi",
      id: upperid,
    });
  } catch (err) {
    console.error("Create user xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// PUT /api/users/:id  — Ma'lumotlarni yangilash (faqat director/deputy)
router.put("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const targetId = req.params.id.toUpperCase();
    const { firstName, lastName, role, groupIds } = req.body;

    await pool.query(
      `UPDATE users SET
         first_name = COALESCE($1, first_name),
         last_name  = COALESCE($2, last_name),
         role       = COALESCE($3, role),
         updated_at = NOW()
       WHERE id = $4`,
      [firstName || null, lastName || null, role || null, targetId],
    );

    // Guruh biriktirishlarini yangilash (master/curator)
    if (groupIds !== undefined) {
      await pool.query("DELETE FROM group_assignments WHERE user_id = $1", [
        targetId,
      ]);
      for (const gid of groupIds) {
        await pool.query(
          `INSERT INTO group_assignments (user_id, group_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [targetId, parseInt(gid)],
        );
      }
    }

    res.json({ message: "Foydalanuvchi ma'lumotlari yangilandi" });
  } catch (err) {
    console.error("Update user xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// DELETE /api/users/:id  (faqat director/deputy)
router.delete("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const targetId = req.params.id.toUpperCase();

    // O'zini o'chira olmaydi
    if (req.user.id === targetId) {
      return res.status(400).json({ error: "O'zingizni o'chira olmaysiz" });
    }

    await pool.query("DELETE FROM users WHERE id = $1", [targetId]);
    res.json({ message: "Foydalanuvchi o'chirildi" });
  } catch (err) {
    console.error("Delete user xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// PUT /api/users/:id/reset-password  (faqat director/deputy)
router.put(
  "/:id/reset-password",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Parol kamida 6 ta belgi" });
      }
      const hashed = await bcrypt.hash(newPassword, 10);
      await pool.query(
        "UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2",
        [hashed, req.params.id.toUpperCase()],
      );
      res.json({ message: "Parol muvaffaqiyatli yangilandi" });
    } catch (err) {
      console.error("Reset password xatosi:", err.message);
      res.status(500).json({ error: "Server xatosi" });
    }
  },
);

module.exports = router;
