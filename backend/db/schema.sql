/* ============================================================
   RESUME ANALYZER API — db/schema.sql
   Database schema for persisting analyses and keywords.
   Run on startup by db.js if tables don't already exist.
   ============================================================ */

-- Stores each analysis run
CREATE TABLE IF NOT EXISTS analyses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  resume_text     TEXT    NOT NULL,
  job_description TEXT,
  score           INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Stores keywords (matched & missing) linked to an analysis
CREATE TABLE IF NOT EXISTS analysis_keywords (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id INTEGER NOT NULL,
  keyword     TEXT    NOT NULL,
  matched     INTEGER NOT NULL CHECK (matched IN (0, 1)),
  FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
);

-- Index for fast lookups by analysis_id
CREATE INDEX IF NOT EXISTS idx_keywords_analysis_id ON analysis_keywords(analysis_id);
