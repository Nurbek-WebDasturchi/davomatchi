require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Xavfsizlik
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://web.telegram.org',
    /\.telegram\.org$/,
  ],
  credentials: true,
}));

// Umumiy rate limit
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: "Juda ko'p so'rov. Keyinroq urinib ko'ring." }
}));

// QR scan uchun qattiqroq limit
app.use('/api/attendance/scan', rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: 'Skanerlash limiti oshdi.' }
}));

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Routelar
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/groups',     require('./routes/groups'));
app.use('/api/students',   require('./routes/students'));

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Sahifa topilmadi' });
});

// Xato handler
app.use((err, req, res, next) => {
  console.error('Server xatosi:', err.message);
  res.status(500).json({ error: 'Ichki server xatosi' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend http://localhost:${PORT} da ishlamoqda`);
});
