CREATE TABLE IF NOT EXISTS analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resume_text TEXT NOT NULL,
  job_description TEXT,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id INTEGER NOT NULL,
  keyword TEXT NOT NULL,
  matched INTEGER NOT NULL CHECK (matched IN (0, 1)),
  FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_keywords_analysis_id ON keywords(analysis_id);
