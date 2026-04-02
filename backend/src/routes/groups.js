const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const {
  authMiddleware,
  requireAdmin,
  requireRole,
  ROLES,
} = require("../middleware/auth");

// ─── Barcha rollar uchun ruxsat matritsasi ───────────────────────────────────
// director / deputy        → barcha guruhlarni ko'radi
// master  / curator        → faqat o'z guruhlarini ko'radi
// attendance_manager       → barcha guruhlarni ko'radi (read-only)
// student                  → ruxsat yo'q

// GET /api/groups
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { role, id } = req.user;
    let query, params;

    if ([...ROLES.ADMIN, ...ROLES.MANAGER].includes(role)) {
      // Director, Deputy, Attendance Manager → barcha guruhlar
      query = `
        SELECT g.id, g.name, g.qr_token,
               c.name AS course_name, c.year,
               COUNT(DISTINCT s.id) AS student_count
        FROM groups g
        LEFT JOIN courses  c ON c.id = g.course_id
        LEFT JOIN students s ON s.group_id = g.id
        GROUP BY g.id, g.name, g.qr_token, c.name, c.year
        ORDER BY c.year, g.name
      `;
      params = [];
    } else if (ROLES.TEACHER.includes(role)) {
      // Master / Curator → faqat tayinlangan guruhlar
      query = `
        SELECT g.id, g.name, g.qr_token,
               c.name AS course_name, c.year,
               COUNT(DISTINCT s.id) AS student_count
        FROM group_assignments ga
        JOIN groups  g ON g.id = ga.group_id
        LEFT JOIN courses  c ON c.id = g.course_id
        LEFT JOIN students s ON s.group_id = g.id
        WHERE ga.user_id = $1
        GROUP BY g.id, g.name, g.qr_token, c.name, c.year
        ORDER BY c.year, g.name
      `;
      params = [id];
    } else {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }

    const result = await pool.query(query, params);
    res.json({ groups: result.rows });
  } catch (err) {
    console.error("Groups xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// GET /api/groups/meta/courses
router.get("/meta/courses", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM courses ORDER BY year");
    res.json({ courses: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

// GET /api/groups/:id/qr
router.get("/:id/qr", authMiddleware, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const { role, id: userId } = req.user;

    // Teacher faqat o'z guruhini ko'ra oladi
    if (ROLES.TEACHER.includes(role)) {
      const assigned = await pool.query(
        "SELECT group_id FROM group_assignments WHERE user_id = $1 AND group_id = $2",
        [userId, groupId],
      );
      if (assigned.rows.length === 0) {
        return res.status(403).json({ error: "Bu guruhga ruxsatingiz yo'q" });
      }
    } else if (role === "student") {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }

    const result = await pool.query(
      "SELECT id, name, qr_token FROM groups WHERE id = $1",
      [groupId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Guruh topilmadi" });
    }

    const group = result.rows[0];
    const qrData = JSON.stringify({
      qrToken: group.qr_token,
      groupId: group.id,
    });
    const qrCode = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    });

    res.json({
      groupId: group.id,
      groupName: group.name,
      qrToken: group.qr_token,
      qrCode,
    });
  } catch (err) {
    console.error("QR xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// GET /api/groups/:id/students
router.get("/:id/students", authMiddleware, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const { role, id: userId } = req.user;

    if (ROLES.TEACHER.includes(role)) {
      const assigned = await pool.query(
        "SELECT group_id FROM group_assignments WHERE user_id = $1 AND group_id = $2",
        [userId, groupId],
      );
      if (assigned.rows.length === 0) {
        return res.status(403).json({ error: "Bu guruhga ruxsatingiz yo'q" });
      }
    } else if (role === "student") {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }

    const result = await pool.query(
      `SELECT s.id,
              u.first_name || ' ' || u.last_name AS full_name,
              u.first_name, u.last_name,
              s.student_code
       FROM students s
       JOIN users u ON u.id = s.id
       WHERE s.group_id = $1
       ORDER BY u.last_name, u.first_name`,
      [groupId],
    );

    res.json({ students: result.rows, total: result.rows.length });
  } catch (err) {
    console.error("Group students xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// POST /api/groups  (faqat director/deputy)
router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { name, courseId } = req.body;
    if (!name || !courseId) {
      return res.status(400).json({ error: "Guruh nomi va kurs kerak" });
    }

    const result = await pool.query(
      "INSERT INTO groups (name, course_id, qr_token) VALUES ($1, $2, $3) RETURNING *",
      [name.trim(), courseId, uuidv4()],
    );

    res.status(201).json({ group: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(400)
        .json({ error: "Bu nomli guruh allaqachon mavjud" });
    }
    console.error("Create group xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// PUT /api/groups/:id  (faqat director/deputy)
router.put("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { name, courseId } = req.body;
    const groupId = parseInt(req.params.id);

    const result = await pool.query(
      `UPDATE groups SET
         name      = COALESCE($1, name),
         course_id = COALESCE($2, course_id)
       WHERE id = $3 RETURNING *`,
      [name || null, courseId || null, groupId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Guruh topilmadi" });
    }

    res.json({ group: result.rows[0] });
  } catch (err) {
    console.error("Update group xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// POST /api/groups/:id/assign  — master/curator guruhga biriktirish
router.post("/:id/assign", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId kerak" });

    const userRes = await pool.query("SELECT role FROM users WHERE id = $1", [
      userId.toUpperCase(),
    ]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }
    if (!ROLES.TEACHER.includes(userRes.rows[0].role)) {
      return res
        .status(400)
        .json({ error: "Faqat master/curator biriktirilishi mumkin" });
    }

    await pool.query(
      `INSERT INTO group_assignments (user_id, group_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId.toUpperCase(), groupId],
    );

    res.json({ message: "Muvaffaqiyatli biriktirildi" });
  } catch (err) {
    console.error("Assign xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// DELETE /api/groups/:id/assign  — biriktirishni olib tashlash
router.delete("/:id/assign", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const { userId } = req.body;

    await pool.query(
      "DELETE FROM group_assignments WHERE user_id = $1 AND group_id = $2",
      [userId.toUpperCase(), groupId],
    );

    res.json({ message: "Biriktirish olib tashlandi" });
  } catch (err) {
    console.error("Unassign xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
