const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const bcrypt = require("bcryptjs");
const { authMiddleware, requireAdmin, ROLES } = require("../middleware/auth");

// UUID validatsiyasi
function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str,
  );
}

// GET /api/students
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    const { groupId, search } = req.query;
    const params = [];
    let where = "WHERE 1=1";

    if (ROLES.TEACHER.includes(role)) {
      const assignedRes = await pool.query(
        "SELECT group_id FROM group_assignments WHERE user_id = $1",
        [userId],
      );
      const assignedIds = assignedRes.rows.map((r) => r.group_id);
      if (assignedIds.length === 0) {
        return res.json({ students: [], total: 0 });
      }
      params.push(assignedIds);
      where += ` AND s.group_id = ANY($${params.length})`;
    } else if ([...ROLES.ADMIN, ...ROLES.MANAGER].includes(role)) {
      if (groupId) {
        if (!isValidUUID(groupId)) {
          return res
            .status(400)
            .json({ error: "Noto'g'ri guruh ID (UUID kerak)" });
        }
        params.push(groupId);
        where += ` AND s.group_id = $${params.length}`;
      }
    } else {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      where += ` AND (u.first_name ILIKE $${params.length}
                   OR u.last_name  ILIKE $${params.length}
                   OR s.id         ILIKE $${params.length})`;
    }

    const result = await pool.query(
      `SELECT s.id,
              u.first_name,
              u.last_name,
              u.first_name || ' ' || u.last_name AS full_name,
              s.student_code,
              s.group_id,
              g.name AS group_name,
              c.name AS course_name
       FROM students s
       JOIN  users   u ON u.id  = s.id
       LEFT JOIN groups  g ON g.id  = s.group_id
       LEFT JOIN courses c ON c.id  = g.course_id
       ${where}
       ORDER BY u.last_name, u.first_name`,
      params,
    );

    res.json({ students: result.rows, total: result.rows.length });
  } catch (err) {
    console.error("Students xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// GET /api/students/:id
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    const studentId = req.params.id.toUpperCase();

    if (role === "student" && userId !== studentId) {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }

    const studentRes = await pool.query(
      `SELECT s.id,
              u.first_name, u.last_name,
              u.first_name || ' ' || u.last_name AS full_name,
              s.student_code, s.group_id,
              g.name AS group_name,
              c.name AS course_name
       FROM students s
       JOIN  users   u ON u.id = s.id
       LEFT JOIN groups  g ON g.id = s.group_id
       LEFT JOIN courses c ON c.id = g.course_id
       WHERE s.id = $1`,
      [studentId],
    );

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: "Talaba topilmadi" });
    }

    const student = studentRes.rows[0];

    if (ROLES.TEACHER.includes(role)) {
      const assigned = await pool.query(
        "SELECT group_id FROM group_assignments WHERE user_id = $1 AND group_id = $2",
        [userId, student.group_id],
      );
      if (assigned.rows.length === 0) {
        return res.status(403).json({ error: "Bu talabaga ruxsatingiz yo'q" });
      }
    }

    const historyRes = await pool.query(
      `SELECT date, status, scanned_at
       FROM attendance
       WHERE student_id = $1
       ORDER BY date DESC
       LIMIT 30`,
      [studentId],
    );

    const statsRes = await pool.query(
      `SELECT
         COUNT(*)                                           AS total_days,
         COUNT(CASE WHEN status = 'present' THEN 1 END)    AS present_days,
         ROUND(
           COUNT(CASE WHEN status='present' THEN 1 END)::decimal
           / NULLIF(COUNT(*), 0) * 100, 1
         )                                                  AS rate
       FROM attendance
       WHERE student_id = $1
         AND date >= CURRENT_DATE - INTERVAL '30 days'`,
      [studentId],
    );

    res.json({
      student,
      history: historyRes.rows,
      stats: statsRes.rows[0],
    });
  } catch (err) {
    console.error("Student detail xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// POST /api/students  (faqat director/deputy)
router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id, password, firstName, lastName, groupId, studentCode } =
      req.body;

    if (!id || !password || !firstName || !lastName || !groupId) {
      return res.status(400).json({
        error: "id, password, firstName, lastName, groupId — barchasi kerak",
      });
    }

    if (!isValidUUID(groupId)) {
      return res.status(400).json({ error: "Noto'g'ri guruh ID (UUID kerak)" });
    }

    const upperid = id.toUpperCase().trim();

    const existing = await pool.query("SELECT id FROM users WHERE id = $1", [
      upperid,
    ]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Bu ID allaqachon mavjud" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (id, password, role, first_name, last_name)
       VALUES ($1, $2, 'student', $3, $4)`,
      [upperid, hashed, firstName.trim(), lastName.trim()],
    );

    // ✅ groupId UUID string — parseInt yo'q
    await pool.query(
      `INSERT INTO students (id, group_id, student_code)
       VALUES ($1, $2, $3)`,
      [upperid, groupId, studentCode || upperid],
    );

    res.status(201).json({
      message: "Talaba muvaffaqiyatli qo'shildi",
      student: {
        id: upperid,
        full_name: `${firstName} ${lastName}`,
        group_id: groupId,
      },
    });
  } catch (err) {
    console.error("Create student xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// PUT /api/students/:id  (faqat director/deputy)
router.put("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const studentId = req.params.id.toUpperCase();
    const { firstName, lastName, groupId, studentCode } = req.body;

    if (groupId && !isValidUUID(groupId)) {
      return res.status(400).json({ error: "Noto'g'ri guruh ID (UUID kerak)" });
    }

    if (firstName || lastName) {
      await pool.query(
        `UPDATE users SET
           first_name = COALESCE($1, first_name),
           last_name  = COALESCE($2, last_name),
           updated_at = NOW()
         WHERE id = $3`,
        [firstName || null, lastName || null, studentId],
      );
    }

    if (groupId || studentCode) {
      // ✅ groupId UUID string — parseInt yo'q
      await pool.query(
        `UPDATE students SET
           group_id     = COALESCE($1, group_id),
           student_code = COALESCE($2, student_code),
           updated_at   = NOW()
         WHERE id = $3`,
        [groupId || null, studentCode || null, studentId],
      );
    }

    res.json({ message: "Talaba ma'lumotlari yangilandi" });
  } catch (err) {
    console.error("Update student xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// DELETE /api/students/:id  (faqat director/deputy)
router.delete("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const studentId = req.params.id.toUpperCase();
    await pool.query("DELETE FROM users WHERE id = $1", [studentId]);
    res.json({ message: "Talaba o'chirildi" });
  } catch (err) {
    console.error("Delete student xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
