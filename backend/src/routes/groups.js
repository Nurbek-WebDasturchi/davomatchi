const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const { authMiddleware, requireRole } = require("../middleware/auth");

// GET /api/groups
router.get("/", authMiddleware, async (req, res) => {
  try {
    let query, params;

    if (req.user.role === "admin") {
      query = `
        SELECT g.id, g.name, g.qr_token,
               c.name AS course_name, c.year,
               u.first_name || ' ' || u.last_name AS teacher_name,
               COUNT(s.id) AS student_count
        FROM groups g
        LEFT JOIN courses  c ON c.id = g.course_id
        LEFT JOIN users    u ON u.id = g.teacher_id
        LEFT JOIN students s ON s.group_id = g.id
        GROUP BY g.id, g.name, g.qr_token, c.name, c.year, u.first_name, u.last_name
        ORDER BY c.year, g.name
      `;
      params = [];
    } else {
      query = `
        SELECT g.id, g.name, g.qr_token,
               c.name AS course_name, c.year,
               u.first_name || ' ' || u.last_name AS teacher_name,
               COUNT(s.id) AS student_count
        FROM groups g
        LEFT JOIN courses  c ON c.id = g.course_id
        LEFT JOIN users    u ON u.id = g.teacher_id
        LEFT JOIN students s ON s.group_id = g.id
        WHERE g.id = $1
        GROUP BY g.id, g.name, g.qr_token, c.name, c.year, u.first_name, u.last_name
      `;
      params = [req.user.group_id];
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

    if (req.user.role === "teacher" && req.user.group_id !== groupId) {
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

    if (req.user.role === "teacher" && req.user.group_id !== groupId) {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }

    const result = await pool.query(
      `SELECT s.id,
              u.first_name || ' ' || u.last_name AS full_name,
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

// POST /api/groups
router.post("/", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { name, courseId, teacherId } = req.body;
    if (!name || !courseId) {
      return res.status(400).json({ error: "Guruh nomi va kurs kerak" });
    }

    const result = await pool.query(
      "INSERT INTO groups (name, course_id, teacher_id, qr_token) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, courseId, teacherId || null, uuidv4()],
    );

    res.status(201).json({ group: result.rows[0] });
  } catch (err) {
    console.error("Create group xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
