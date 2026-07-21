/* ============================================================
   RESUME ANALYZER API — server.js
   Main Express application entry point.
   Mounts middleware, routes, and global error handler.
   ============================================================ */

const express = require('express');
const cors = require('cors');
const analyzeRoutes = require('./routes/analyze');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────

// Parse JSON request bodies (limit payload size to 1 MB)
app.use(express.json({ limit: '1mb' }));

// Enable CORS for the frontend (adjust origin in production)
app.use(cors());

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
  console.log(`   Health check: GET  /api/health`);
  console.log(`   Analyze:      POST /api/analyze\n`);
});
