/* ============================================================
   RESUME ANALYZER API — routes/analyses.js
   CRUD routes for persisted analyses.

   GET    /api/analyses      — list all (lightweight)
   GET    /api/analyses/:id  — get one with keywords
   DELETE /api/analyses/:id  — delete one (cascades keywords)

   All queries use parameterized placeholders (?).
   ============================================================ */

const { Router } = require('express');
const {
  selectAllAnalyses,
  selectAnalysisById,
  selectKeywordsByAnalysisId,
  deleteAnalysisById,
} = require('../db/db');

const router = Router();

/* ──────────────────────────────────────────────────────────────
   GET /api/analyses
   Returns a lightweight list: id, score, created_at only.
   ────────────────────────────────────────────────────────────── */
router.get('/', (req, res, next) => {
  try {
    const rows = selectAllAnalyses.all();
    return res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
});

/* ──────────────────────────────────────────────────────────────
   GET /api/analyses/:id
   Returns full analysis with matched & missing keywords.
   ────────────────────────────────────────────────────────────── */
router.get('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'The analysis ID must be a positive integer.',
      });
    }

    const analysis = selectAnalysisById.get(id);

    if (!analysis) {
      return res.status(404).json({
        error: 'Not found',
        message: `No analysis found with id ${id}.`,
      });
    }

    // Fetch associated keywords and split into matched/missing
    const keywordRows = selectKeywordsByAnalysisId.all(id);
    const matchedKeywords = [];
    const missingKeywords = [];

    for (const row of keywordRows) {
      if (row.matched === 1) {
        matchedKeywords.push(row.keyword);
      } else {
        missingKeywords.push(row.keyword);
      }
    }

    return res.status(200).json({
      id: analysis.id,
      score: analysis.score,
      resume_text: analysis.resume_text,
      job_description: analysis.job_description,
      created_at: analysis.created_at,
      matchedKeywords: matchedKeywords.sort(),
      missingKeywords: missingKeywords.sort(),
    });
  } catch (err) {
    next(err);
  }
});

/* ──────────────────────────────────────────────────────────────
   DELETE /api/analyses/:id
   Deletes the analysis and its keywords (via ON DELETE CASCADE).
   ────────────────────────────────────────────────────────────── */
router.delete('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'The analysis ID must be a positive integer.',
      });
    }

    const result = deleteAnalysisById.run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: `No analysis found with id ${id}.`,
      });
    }

    return res.status(200).json({
      message: `Analysis ${id} deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
