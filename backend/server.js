/* ============================================================
   RESUME ANALYZER API — server.js
   Main Express application entry point.
   Mounts middleware, routes, and global error handler.
   ============================================================ */

const express = require('express');
const cors = require('cors');
require('./db/db'); // Initialize database & run schema on startup
const analyzeRoutes = require('./routes/analyze');
const analysesRoutes = require('./routes/analyses');

const app = express();
const PORT = process.env.PORT || 3001;
const allowedOrigins = new Set([
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'null',
]);

// ── Middleware ──────────────────────────────────────────────

// Parse JSON request bodies (limit payload size to 1 MB)
app.use(express.json({ limit: '1mb' }));

// Enable CORS for the frontend (adjust origin in production)
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin ${origin}`));
    },
  })
);

// ── Request Logger ─────────────────────────────────────────
// Logs: METHOD /path → STATUS  (duration)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.originalUrl} → ${res.statusCode}  (${duration}ms)`
    );
  });
  next();
});

// ── Routes ─────────────────────────────────────────────────

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Resume analysis routes
app.use('/api', analyzeRoutes);

// Persisted analyses CRUD routes
app.use('/api/analyses', analysesRoutes);

// ── 404 Handler ────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── Global Error Handler ───────────────────────────────────
// Catches any unhandled errors thrown in route handlers
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message:
      process.env.NODE_ENV === 'production'
        ? 'Something went wrong'
        : err.message,
  });
});

// ── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Resume Analyzer API running at http://localhost:${PORT}`);
  console.log(`   Health check:    GET    /api/health`);
  console.log(`   Analyze:         POST   /api/analyze`);
  console.log(`   List analyses:   GET    /api/analyses`);
  console.log(`   Get analysis:    GET    /api/analyses/:id`);
  console.log(`   Delete analysis: DELETE /api/analyses/:id\n`);
});
