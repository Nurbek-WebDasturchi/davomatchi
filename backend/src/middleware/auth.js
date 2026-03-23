const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

// Rol guruhlari
const ROLES = {
  ADMIN:    ['director', 'deputy'],
  TEACHER:  ['master', 'curator'],
  MANAGER:  ['attendance_manager'],
  STUDENT:  ['student'],
};

// Token tekshiruvchi
async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token topilmadi' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      'SELECT id, role, first_name, last_name FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token muddati tugagan' });
    }
    return res.status(401).json({ error: "Noto'g'ri token" });
  }
}

// Rol tekshiruvchi
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }
    next();
  };
}

// Admin (director/deputy) tekshiruvi
function requireAdmin(req, res, next) {
  if (!ROLES.ADMIN.includes(req.user.role)) {
    return res.status(403).json({ error: "Faqat direktorlar uchun" });
  }
  next();
}

// Teacher (master/curator) yoki admin
function requireTeacherOrAdmin(req, res, next) {
  if (![...ROLES.ADMIN, ...ROLES.TEACHER].includes(req.user.role)) {
    return res.status(403).json({ error: "Ruxsat yo'q" });
  }
  next();
}

module.exports = { authMiddleware, requireRole, requireAdmin, requireTeacherOrAdmin, ROLES };
