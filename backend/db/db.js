/* ============================================================
   RESUME ANALYZER API — db/db.js
   Initializes a SQLite connection using better-sqlite3.
   Reads and executes schema.sql on startup if tables don't
   already exist (CREATE TABLE IF NOT EXISTS is idempotent).
   Exports the database instance for use in route handlers.
   ============================================================ */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database file lives alongside this module: db/resume_analyzer.db
const DB_PATH = path.join(__dirname, 'resume_analyzer.db');

// Open (or create) the database
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Enable foreign key enforcement (off by default in SQLite)
db.pragma('foreign_keys = ON');

// ── Run schema on startup ───────────────────────────────────
const schemaPath = path.join(__dirname, 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schemaSql);

console.log(`📦 SQLite database initialized at ${DB_PATH}`);

// ── Prepared statements (cached for performance) ────────────

/** Insert a new analysis row; returns { lastInsertRowid } */
const insertAnalysis = db.prepare(`
  INSERT INTO analyses (resume_text, job_description, score)
  VALUES (?, ?, ?)
`);

/** Insert a single keyword row linked to an analysis */
const insertKeyword = db.prepare(`
  INSERT INTO analysis_keywords (analysis_id, keyword, matched)
  VALUES (?, ?, ?)
`);

/** Fetch all analyses (lightweight: no resume_text) */
const selectAllAnalyses = db.prepare(`
  SELECT id, score, created_at FROM analyses ORDER BY created_at DESC
`);

/** Fetch one analysis by id (full row) */
const selectAnalysisById = db.prepare(`
  SELECT id, resume_text, job_description, score, created_at
  FROM analyses WHERE id = ?
`);

/** Fetch keywords for a given analysis_id */
const selectKeywordsByAnalysisId = db.prepare(`
  SELECT keyword, matched FROM analysis_keywords WHERE analysis_id = ?
`);

/** Delete an analysis by id (CASCADE deletes keywords automatically) */
const deleteAnalysisById = db.prepare(`
  DELETE FROM analyses WHERE id = ?
`);

/**
 * Persist an analysis and its keywords inside a single transaction.
 * @param {string} resumeText
 * @param {string|null} jobDescription
 * @param {number} score
 * @param {string[]} matchedKeywords
 * @param {string[]} missingKeywords
 * @returns {number} The new analysis id
 */
function persistAnalysis(resumeText, jobDescription, score, matchedKeywords, missingKeywords) {
  const persist = db.transaction(() => {
    const info = insertAnalysis.run(resumeText, jobDescription || null, score);
    const analysisId = Number(info.lastInsertRowid);

    for (const kw of matchedKeywords) {
      insertKeyword.run(analysisId, kw, 1);
    }
    for (const kw of missingKeywords) {
      insertKeyword.run(analysisId, kw, 0);
    }

    return analysisId;
  });

  return persist();
}

// ── Graceful shutdown ───────────────────────────────────────
process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

module.exports = {
  db,
  persistAnalysis,
  selectAllAnalyses,
  selectAnalysisById,
  selectKeywordsByAnalysisId,
  deleteAnalysisById,
};
