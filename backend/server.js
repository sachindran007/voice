require('dotenv').config({ path: '../.env' });
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const uploadRoutes = require('./routes/upload');
const recordingsRoutes = require('./routes/recordings');

const app = express();
const PORT = process.env.PORT || 5000;
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:3000',
  'http://10.0.2.2:5000',
  'https://vocalistai.netlify.app',
  ...configuredOrigins
]);
const allowedOriginPatterns = [
  /^http:\/\/192\.168\./,
  /^http:\/\/10\./
];

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin) || allowedOriginPatterns.some((pattern) => pattern.test(origin))) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Uploads directory ───────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/upload', uploadRoutes);
app.use('/api/recordings', recordingsRoutes);

// ── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      supabase: !!process.env.SUPABASE_URL,
      gemini: !!process.env.GEMINI_API_KEY
    }
  });
});

// ── 404 handler ─────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎙️  AI Voice Recorder Backend`);
  console.log(`📡 Server running at http://localhost:${PORT}`);
  console.log(`🌐 Also accessible at http://0.0.0.0:${PORT} (LAN)`);
  console.log(`✅ Supabase: ${process.env.SUPABASE_URL ? 'Connected' : '⚠️ Not configured'}`);
  console.log(`✅ Gemini: ${process.env.GEMINI_API_KEY ? 'Connected' : '⚠️ Not configured'}\n`);
});

module.exports = app;
