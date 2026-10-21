const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const pool = require("../db/pool");
const { authMiddleware, requireAdmin, ROLES } = require("../middleware/auth");

// O'zbekiston vaqtini qaytaradi (UTC+5)
// .getUTCHours() bilan ishlatiladi — chunki biz UTC ga +5 qo'shganmiz
function getUzbekTime() {
  const now = new Date();
  return new Date(now.getTime() + 5 * 60 * 60 * 1000);
}

// O'zbekiston sanasini "YYYY-MM-DD" formatida qaytaradi
// new Date().toISOString() UTC sana qaytaradi — O'zbekistonda kech tun
// bo'lsa sana bir kun orqada chiqishi mumkin. Shu sababli bu funksiya ishlatiladi.
function getTodayUzbekDate() {
  const t = getUzbekTime();
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, "0");
  const d = String(t.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// POST /api/attendance/scan
router.post("/scan", authMiddleware, async (req, res) => {
  try {
    const { qrToken, studentId } = req.body;
    if (!qrToken || !studentId) {
      return res.status(400).json({ error: "qrToken va studentId kerak" });
    }

    const groupRes = await pool.query(
      "SELECT id, name FROM groups WHERE qr_token = $1",
      [qrToken],
    );
    if (groupRes.rows.length === 0) {
      return res.status(404).json({ error: "Noto'g'ri QR kod" });
    }
    const group = groupRes.rows[0];

    const studentRes = await pool.query(
      `SELECT s.id, u.first_name, u.last_name, s.group_id
       FROM students s JOIN users u ON u.id = s.id WHERE s.id = $1`,
      [studentId],
    );
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: "Talaba topilmadi" });
    }
    const student = studentRes.rows[0];

    if (student.group_id !== group.id) {
      return res
        .status(400)
        .json({ error: "Bu QR kod sizning guruhingizga tegishli emas" });
    }

    const today = getTodayUzbekDate();
    const existing = await pool.query(
      "SELECT id, scanned_at FROM attendance WHERE student_id = $1 AND date = $2",
      [studentId, today],
    );

    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        alreadyMarked: true,
        message: "Bugun allaqachon belgilangan",
        attendance: {
          studentName: `${student.first_name} ${student.last_name}`,
          groupName: group.name,
          scannedAt: existing.rows[0].scanned_at,
        },
      });
    }

    const att = await pool.query(
      `INSERT INTO attendance (student_id, group_id, date, status, marked_by, scanned_at)
       VALUES ($1, $2, $3, 'present', $4, NOW()) RETURNING scanned_at`,
      [studentId, group.id, today, req.user.id],
    );

    res.json({
      success: true,
      alreadyMarked: false,
      message: "Davomat muvaffaqiyatli belgilandi!",
      attendance: {
        studentName: `${student.first_name} ${student.last_name}`,
        groupName: group.name,
        scannedAt: att.rows[0].scanned_at,
      },
    });
  } catch (err) {
    console.error("Scan xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// POST /api/attendance/manual
router.post("/manual", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "attendance_manager") {
      return res.status(403).json({ error: "Faqat davomatchi uchun" });
    }

    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: "Talaba ID kerak" });
    }

    const studentRes = await pool.query(
      `SELECT s.id, u.first_name, u.last_name, s.group_id, g.name AS group_name
       FROM students s
       JOIN users u ON u.id = s.id
       LEFT JOIN groups g ON g.id = s.group_id
       WHERE s.id = $1`,
      [studentId.toUpperCase().trim()],
    );

    if (studentRes.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Talaba topilmadi. ID ni tekshiring." });
    }
    const student = studentRes.rows[0];

    const today = getTodayUzbekDate();
    const existing = await pool.query(
      "SELECT id, scanned_at FROM attendance WHERE student_id = $1 AND date = $2",
      [student.id, today],
    );

    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        alreadyMarked: true,
        message: "Bu talaba bugun allaqachon belgilangan",
        student: {
          id: student.id,
          name: `${student.first_name} ${student.last_name}`,
          groupName: student.group_name,
          scannedAt: existing.rows[0].scanned_at,
        },
      });
    }

    const att = await pool.query(
      `INSERT INTO attendance (student_id, group_id, date, status, marked_by, scanned_at)
       VALUES ($1, $2, $3, 'present', $4, NOW()) RETURNING scanned_at`,
      [student.id, student.group_id, today, req.user.id],
    );

    res.json({
      success: true,
      alreadyMarked: false,
      message: "Davomat muvaffaqiyatli belgilandi!",
      student: {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        groupName: student.group_name,
        scannedAt: att.rows[0].scanned_at,
      },
    });
  } catch (err) {
    console.error("Manual attendance xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// GET /api/attendance/today
router.get("/today", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const today = getTodayUzbekDate();

    const byCourse = await pool.query(
      `SELECT c.id AS course_id, c.name AS course_name, c.year,
              COUNT(DISTINCT s.id)         AS total_students,
              COUNT(DISTINCT a.student_id) AS present_count
       FROM courses c
       LEFT JOIN groups   g ON g.course_id = c.id
       LEFT JOIN students s ON s.group_id  = g.id
       LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
       GROUP BY c.id, c.name, c.year ORDER BY c.year`,
      [today],
    );

    const totals = await pool.query(
      `SELECT COUNT(DISTINCT s.id)         AS total_students,
              COUNT(DISTINCT a.student_id) AS present_today
       FROM students s
       LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1`,
      [today],
    );

    res.json({ date: today, totals: totals.rows[0], byCourse: byCourse.rows });
  } catch (err) {
    console.error("Today xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// GET /api/attendance/all-groups
router.get("/all-groups", authMiddleware, async (req, res) => {
  try {
    const allowed = ["attendance_manager", "director", "deputy"];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }

    const today = getTodayUzbekDate();

    const groups = await pool.query(
      `SELECT g.id, g.name, c.name AS course_name,
              COUNT(DISTINCT s.id)         AS total_students,
              COUNT(DISTINCT a.student_id) AS present_count
       FROM groups g
       LEFT JOIN courses c    ON c.id = g.course_id
       LEFT JOIN students s   ON s.group_id = g.id
       LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
       GROUP BY g.id, g.name, c.name
       ORDER BY c.name, g.name`,
      [today],
    );

    res.json({ groups: groups.rows, date: today });
  } catch (err) {
    console.error("All groups xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// GET /api/attendance/group/:groupId
router.get("/group/:groupId", authMiddleware, async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const date = req.query.date || getTodayUzbekDate();
    const user = req.user;

    if (ROLES.TEACHER.includes(user.role)) {
      const assigned = await pool.query(
        "SELECT group_id FROM group_assignments WHERE user_id = $1 AND group_id = $2",
        [user.id, groupId],
      );
      if (assigned.rows.length === 0) {
        return res.status(403).json({ error: "Bu guruhga ruxsatingiz yo'q" });
      }
    } else if (
      !["director", "deputy", "attendance_manager"].includes(user.role)
    ) {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }

    const groupInfo = await pool.query(
      `SELECT g.id, g.name, g.qr_token, c.name AS course_name
       FROM groups g LEFT JOIN courses c ON c.id = g.course_id
       WHERE g.id = $1`,
      [groupId],
    );

    if (groupInfo.rows.length === 0) {
      return res.status(404).json({ error: "Guruh topilmadi" });
    }

    const students = await pool.query(
      `SELECT s.id,
              u.first_name || ' ' || u.last_name AS full_name,
              s.student_code,
              CASE WHEN a.id IS NOT NULL THEN true ELSE false END AS is_present,
              (a.scanned_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tashkent') AS scanned_at,
              a.status
       FROM students s
       JOIN users u ON u.id = s.id
       LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
       WHERE s.group_id = $2
       ORDER BY is_present DESC, u.last_name`,
      [date, groupId],
    );

    const presentCount = students.rows.filter((s) => s.is_present).length;

    res.json({
      group: groupInfo.rows[0],
      date,
      totalStudents: students.rows.length,
      presentCount,
      students: students.rows,
    });
  } catch (err) {
    console.error("Group attendance xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// GET /api/attendance/my-groups
router.get("/my-groups", authMiddleware, async (req, res) => {
  try {
    if (!ROLES.TEACHER.includes(req.user.role)) {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }

    const today = getTodayUzbekDate();

    const groups = await pool.query(
      `SELECT g.id, g.name, c.name AS course_name,
              COUNT(DISTINCT s.id)         AS total_students,
              COUNT(DISTINCT a.student_id) AS present_count
       FROM group_assignments ga
       JOIN groups g ON g.id = ga.group_id
       LEFT JOIN courses c    ON c.id = g.course_id
       LEFT JOIN students s   ON s.group_id = g.id
       LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
       WHERE ga.user_id = $2
       GROUP BY g.id, g.name, c.name ORDER BY g.name`,
      [today, req.user.id],
    );

    res.json({ groups: groups.rows, date: today });
  } catch (err) {
    console.error("My groups xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// GET /api/attendance/course/:courseId/groups
router.get(
  "/course/:courseId/groups",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const today = getTodayUzbekDate();
      const courseId = req.params.courseId;

      const groups = await pool.query(
        `SELECT g.id, g.name, g.qr_token,
              COUNT(DISTINCT s.id)         AS total_students,
              COUNT(DISTINCT a.student_id) AS present_count
       FROM groups g
       LEFT JOIN students   s ON s.group_id = g.id
       LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
       WHERE g.course_id = $2
       GROUP BY g.id, g.name, g.qr_token ORDER BY g.name`,
        [today, courseId],
      );

      res.json({ groups: groups.rows, date: today });
    } catch (err) {
      console.error("Course groups xatosi:", err.message);
      res.status(500).json({ error: "Server xatosi" });
    }
  },
);

// GET /api/attendance/analytics
// ─────────────────────────────────────────────────────────────────────────────
// ASOSIY FIX: avval faqat attendance jadvalidagi studentlar sanalar edi →
// present_count / present_count = 100%.
// Endi har kun uchun BARCHA guruh talabalarini mustaqil subquery bilan olamiz.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/analytics", authMiddleware, async (req, res) => {
  try {
    const period = req.query.period === "month" ? 30 : 7;
    const user = req.user;

    // Teacher bo'lsa faqat o'z guruhlari, aks holda hamma guruhlar
    let totalStudentsQuery;
    let totalParams;

    if (ROLES.TEACHER.includes(user.role)) {
      // O'z guruhlaridagi jami talabalar soni
      totalStudentsQuery = `
        SELECT COUNT(DISTINCT s.id)
        FROM students s
        JOIN group_assignments ga ON ga.group_id = s.group_id
        WHERE ga.user_id = $1
      `;
      totalParams = [user.id];
    } else if (req.query.groupId) {
      // Bitta guruh filtri
      totalStudentsQuery = `
        SELECT COUNT(DISTINCT s.id)
        FROM students s
        WHERE s.group_id = $1
      `;
      totalParams = [req.query.groupId];
    } else {
      // Hamma talabalar
      totalStudentsQuery = `SELECT COUNT(DISTINCT id) FROM students`;
      totalParams = [];
    }

    // Jami talabalar sonini bir marta olamiz
    const totalRes = await pool.query(totalStudentsQuery, totalParams);
    const totalStudents = parseInt(totalRes.rows[0].count) || 0;

    // Har kun uchun present_count ni olamiz
    let whereExtra = "";
    const params = [period];

    if (ROLES.TEACHER.includes(user.role)) {
      params.push(user.id);
      whereExtra = `AND ga.user_id = $${params.length}`;
    } else if (req.query.groupId) {
      params.push(req.query.groupId);
      whereExtra = `AND g.id = $${params.length}`;
    }

    const rows = await pool.query(
      `SELECT
         dates.day AS date,
         COALESCE(COUNT(DISTINCT a.student_id), 0) AS present_count,
         ${/* total_students har qatorda bir xil */ ""}
         ${totalStudents} AS total_students
       FROM (
         SELECT generate_series(
           CURRENT_DATE - ($1 || ' days')::interval,
           CURRENT_DATE,
           '1 day'::interval
         )::date AS day
       ) dates
       LEFT JOIN attendance a ON a.date = dates.day
       LEFT JOIN students s ON s.id = a.student_id
       LEFT JOIN groups g ON g.id = s.group_id
       ${ROLES.TEACHER.includes(user.role) ? "LEFT JOIN group_assignments ga ON ga.group_id = g.id" : ""}
       ${whereExtra ? `WHERE 1=1 ${whereExtra}` : ""}
       GROUP BY dates.day
       ORDER BY dates.day`,
      params,
    );

    res.json({ analytics: rows.rows, period });
  } catch (err) {
    console.error("Analytics xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// GET /api/attendance/export
// Mobil qurilmalar (Android/iOS/Telegram) uchun:
// token query param orqali ham auth qabul qilinadi
// Chunki window.location.href da Authorization header yuborib bo'lmaydi
const tokenFromQuery = (req, res, next) => {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
};

function getTelegramWebAppUser(initData) {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken || !initData) return null;
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  const userValue = params.get("user");
  if (!receivedHash || !authDate || !userValue) return null;
  if (Math.abs(Date.now() / 1000 - authDate) > 24 * 60 * 60) return null;

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  const received = Buffer.from(receivedHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
  try {
    const user = JSON.parse(userValue);
    return user.id ? user : null;
  } catch {
    return null;
  }
}

router.get("/export", tokenFromQuery, authMiddleware, async (req, res) => {
  try {
    const allowed = ["director", "deputy", "attendance_manager"];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }

    const end = req.query.endDate || getTodayUzbekDate();
    const start =
      req.query.startDate ||
      (() => {
        const t = getUzbekTime();
        t.setUTCDate(t.getUTCDate() - 7);
        return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
      })();

    const result = await pool.query(
      `SELECT u.last_name || ' ' || u.first_name AS "Talaba ismi",
              s.student_code AS "Talaba kodi",
              g.name         AS "Guruh",
              c.name         AS "Kurs",
              TO_CHAR(a.date, 'YYYY-MM-DD') AS "Sana",
              a.status       AS "Holat",
              TO_CHAR(a.scanned_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS "Vaqt"
       FROM attendance a
       JOIN students s ON s.id  = a.student_id
       JOIN users    u ON u.id  = s.id
       JOIN groups   g ON g.id  = a.group_id
       JOIN courses  c ON c.id  = g.course_id
       WHERE a.date BETWEEN $1 AND $2
       ORDER BY a.date, g.name, u.last_name`,
      [start, end],
    );

    // ExcelJS bilan to'g'ridan-to'g'ri Excel fayl yaratib yuboramiz
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Davomat");

    const columns = [
      { header: "Talaba ismi", key: "Talaba ismi", width: 30 },
      { header: "Talaba kodi", key: "Talaba kodi", width: 16 },
      { header: "Guruh", key: "Guruh", width: 16 },
      { header: "Kurs", key: "Kurs", width: 16 },
      { header: "Sana", key: "Sana", width: 14 },
      { header: "Holat", key: "Holat", width: 12 },
      { header: "Vaqt", key: "Vaqt", width: 10 },
    ];
    sheet.columns = columns;

    // Sarlavha qatorini stillashtirish
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A5F" },
    };

    // Ma'lumotlar
    result.rows.forEach((row) => {
      sheet.addRow(columns.map((col) => row[col.key] ?? ""));
    });

    const filename = `davomat_${start}_${end}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export xatosi:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
});

router.post("/export/telegram", authMiddleware, async (req, res) => {
  try {
    if (!["director", "deputy", "attendance_manager"].includes(req.user.role)) {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }
    if (!process.env.BOT_TOKEN) {
      return res.status(503).json({ error: "Backend serverda BOT_TOKEN sozlanmagan. Telegram bot tokenini backend environment variables'iga qo'shing." });
    }
    const telegramUser = getTelegramWebAppUser(req.get("X-Telegram-Init-Data"));
    if (!telegramUser) {
      return res.status(401).json({ error: "Telegram sessiyasi tasdiqlanmadi. Ilovani botdan qayta oching." });
    }
    if (typeof FormData === "undefined" || typeof Blob === "undefined") {
      return res.status(500).json({ error: "Server Telegram fayl yuborishni qo'llamaydi" });
    }

    const end = req.body?.endDate || getTodayUzbekDate();
    const start = req.body?.startDate || (() => {
      const t = getUzbekTime();
      t.setUTCDate(t.getUTCDate() - 7);
      return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
    })();
    const result = await pool.query(
      `SELECT u.last_name || ' ' || u.first_name AS "Talaba ismi",
              s.student_code AS "Talaba kodi", g.name AS "Guruh", c.name AS "Kurs",
              TO_CHAR(a.date, 'YYYY-MM-DD') AS "Sana", a.status AS "Holat",
              TO_CHAR(a.scanned_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tashkent', 'HH24:MI') AS "Vaqt"
       FROM attendance a JOIN students s ON s.id = a.student_id
       JOIN users u ON u.id = s.id JOIN groups g ON g.id = a.group_id
       JOIN courses c ON c.id = g.course_id
       WHERE a.date BETWEEN $1 AND $2 ORDER BY a.date, g.name, u.last_name`,
      [start, end],
    );
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Davomat");
    const columns = [
      { header: "Talaba ismi", key: "Talaba ismi", width: 30 },
      { header: "Talaba kodi", key: "Talaba kodi", width: 16 },
      { header: "Guruh", key: "Guruh", width: 16 },
      { header: "Kurs", key: "Kurs", width: 16 },
      { header: "Sana", key: "Sana", width: 14 },
      { header: "Holat", key: "Holat", width: 12 },
      { header: "Vaqt", key: "Vaqt", width: 10 },
    ];
    sheet.columns = columns;
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    result.rows.forEach((row) => sheet.addRow(columns.map((column) => row[column.key] ?? "")));

    const form = new FormData();
    form.append("chat_id", String(telegramUser.id));
    form.append("caption", "Davomat hisoboti: " + start + " — " + end);
    form.append("document", new Blob([await workbook.xlsx.writeBuffer()], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }), "davomat_" + start + "_" + end + ".xlsx");
    const telegramResponse = await fetch("https://api.telegram.org/bot" + process.env.BOT_TOKEN + "/sendDocument", {
      method: "POST",
      body: form,
    });
    const telegramResult = await telegramResponse.json();
    if (!telegramResponse.ok || !telegramResult.ok) {
      console.error("Telegram Excel jo'natish xatosi:", telegramResult.description || telegramResponse.status);
      return res.status(502).json({ error: "Bot faylni yubora olmadi. Bot bilan suhbatni ochib /start bosing." });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Telegram export xatosi:", err.message);
    res.status(500).json({ error: "Excel faylini Telegramga yuborib bo'lmadi" });
  }
});

module.exports = router;
