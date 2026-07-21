/* ============================================================
   RESUME ANALYZER API — routes/analyze.js
   POST /api/analyze route handler.

   Analysis logic runs in-memory, then results are persisted
   to SQLite via db/db.js.
   This module exports an Express Router.
   ============================================================ */

const { Router } = require('express');
const { persistAnalysis } = require('../db/db');

const router = Router();

// ── Common English stop-words to filter out of the job description ──
const STOP_WORDS = new Set([
  'a','about','above','after','again','against','all','am','an','and','any',
  'are','aren','as','at','be','because','been','before','being','below',
  'between','both','but','by','can','could','did','do','does','doing',
  'down','during','each','few','for','from','further','get','got','had',
  'has','have','having','he','her','here','hers','herself','him','himself',
  'his','how','i','if','in','into','is','isn','it','its','itself','just',
  'let','like','ll','may','me','might','more','most','must','my','myself',
  'no','nor','not','now','of','off','on','once','only','or','other','our',
  'ours','ourselves','out','over','own','per','re','s','same','shall','she',
  'should','so','some','such','t','than','that','the','their','theirs',
  'them','themselves','then','there','these','they','this','those','through',
  'to','too','under','until','up','upon','us','ve','very','was','we','were',
  'what','when','where','which','while','who','whom','why','will','with',
  'won','would','you','your','yours','yourself','yourselves',
  // common job-posting filler words
  'ability','able','also','apply','based','company','including','ideal',
  'join','looking','new','opportunity','plus','position','preferred',
  'qualifications','required','requirements','responsibilities','role',
  'strong','team','using','used','well','within','work','working','years',
]);

// ── Expected resume sections ──
const EXPECTED_SECTIONS = [
  { name: 'Experience',  regex: /\b(experience|work\s+history|employment|professional\s+experience)\b/i },
  { name: 'Education',   regex: /\b(education|academic|degree|university|college|certification)\b/i },
  { name: 'Skills',      regex: /\b(skills|technologies|tech\s+stack|competencies|proficiencies)\b/i },
  { name: 'Projects',    regex: /\b(projects|portfolio|personal\s+projects|key\s+projects)\b/i },
  { name: 'Summary',     regex: /\b(summary|objective|profile|about\s+me|professional\s+summary)\b/i },
];

/* ──────────────────────────────────────────────────────────────
   POST /api/analyze
   Body: { resumeText: string, jobDescription?: string }
   ────────────────────────────────────────────────────────────── */
router.post('/analyze', (req, res, next) => {
  try {
    const { resumeText, jobDescription } = req.body;

    // ── Validation ──────────────────────────────────────────
    if (!resumeText || typeof resumeText !== 'string') {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'The "resumeText" field is required and must be a non-empty string.',
      });
    }

    const trimmedResume = resumeText.trim();

    if (trimmedResume.length < 50) {
      return res.status(400).json({
        error: 'Validation failed',
        message: `Resume text is too short (${trimmedResume.length} characters). Please provide at least 50 characters.`,
      });
    }

    const hasJD =
      typeof jobDescription === 'string' && jobDescription.trim().length > 0;
    const trimmedJD = hasJD ? jobDescription.trim() : '';

    // ── Tokenizer ───────────────────────────────────────────
    // Splits text into lowercase words, keeps letters/digits/hyphens/+/#,
    // removes anything ≤2 characters.
    function tokenize(text) {
      return text
        .toLowerCase()
        .replace(/[^a-z0-9\s\-+#]/g, ' ')
        .split(/\s+/)
        .map((w) => w.replace(/^[.\-]+|[.\-]+$/g, ''))  // strip leading/trailing dots & hyphens
        .filter((w) => w.length > 2);
    }

    // ── Extract JD keywords (deduplicated, stop-words removed) ──
    const resumeTokens = new Set(tokenize(trimmedResume));
    let jdKeywords = [];

    if (hasJD) {
      const seen = new Set();
      for (const word of tokenize(trimmedJD)) {
        if (!STOP_WORDS.has(word) && !seen.has(word)) {
          seen.add(word);
          jdKeywords.push(word);
        }
      }
    }

    // ── Keyword matching (case-insensitive, already lowercased) ──
    const matchedKeywords = [];
    const missingKeywords = [];

    for (const kw of jdKeywords) {
      if (resumeTokens.has(kw)) {
        matchedKeywords.push(kw);
      } else {
        missingKeywords.push(kw);
      }
    }

    // ── Section detection ───────────────────────────────────
    const sectionsFound = [];
    const sectionsMissing = [];

    for (const section of EXPECTED_SECTIONS) {
      if (section.regex.test(trimmedResume)) {
        sectionsFound.push(section.name);
      } else {
        sectionsMissing.push(section.name);
      }
    }

    // ── Word count ──────────────────────────────────────────
    const wordCount = trimmedResume.split(/\s+/).filter(Boolean).length;

    // ── Warnings ────────────────────────────────────────────
    const warnings = [];

    // Section warnings
    for (const name of sectionsMissing) {
      warnings.push(`No "${name}" section detected.`);
    }

    // Length warnings
    if (wordCount < 100) {
      warnings.push(
        `Resume is very short (${wordCount} words). Aim for at least 300 words for a standard resume.`
      );
    } else if (wordCount < 300) {
      warnings.push(
        `Resume is shorter than recommended (${wordCount} words). Consider expanding to 300–600 words.`
      );
    } else if (wordCount > 1200) {
      warnings.push(
        `Resume is quite long (${wordCount} words). Most recruiters prefer 1–2 pages (300–900 words).`
      );
    }

    // Keyword ratio warning
    if (hasJD && jdKeywords.length > 0 && missingKeywords.length > matchedKeywords.length) {
      warnings.push(
        'More job description keywords are missing than matched. Try incorporating more relevant terms.'
      );
    }

    // No JD notice
    if (!hasJD) {
      warnings.push(
        'No job description provided. Keyword matching was skipped; only structural analysis was performed.'
      );
    }

    // Action verbs check
    const actionVerbPattern =
      /\b(managed|led|developed|created|designed|implemented|improved|increased|reduced|delivered|built|launched|coordinated|analyzed|optimized|architected|mentored|negotiated|streamlined)\b/i;
    if (!actionVerbPattern.test(trimmedResume)) {
      warnings.push(
        'Consider using strong action verbs (e.g., "managed," "developed," "implemented") to describe accomplishments.'
      );
    }

    // Quantifiable achievements check
    const quantPattern = /\d+\s*%|\$\s*[\d,]+|\d+\s*(users|clients|projects|team|people|revenue|customers)/i;
    if (!quantPattern.test(trimmedResume)) {
      warnings.push(
        'Add quantifiable achievements (e.g., "increased revenue by 20%") to strengthen impact.'
      );
    }

    // ── Score Calculation (0–100) ───────────────────────────
    //
    // Breakdown:
    //   Section completeness:   up to 30 points
    //   Word count adequacy:    up to 20 points
    //   Keyword match ratio:    up to 35 points (neutral 15 if no JD)
    //   Action verbs bonus:     up to  8 points
    //   Quantifiable bonus:     up to  7 points
    //   Total possible:            100 points

    let score = 0;

    // Section completeness (30 pts max)
    score += (sectionsFound.length / EXPECTED_SECTIONS.length) * 30;

    // Word count adequacy (20 pts max)
    if (wordCount >= 300 && wordCount <= 900) {
      score += 20;
    } else if (wordCount >= 200 && wordCount < 300) {
      score += 14;
    } else if (wordCount > 900 && wordCount <= 1200) {
      score += 14;
    } else if (wordCount >= 100 && wordCount < 200) {
      score += 8;
    } else {
      score += 3;
    }

    // Keyword match ratio (35 pts max, or 15 neutral if no JD)
    if (hasJD && jdKeywords.length > 0) {
      const matchRatio = matchedKeywords.length / jdKeywords.length;
      score += matchRatio * 35;
    } else {
      score += 15; // neutral baseline without JD
    }

    // Action verbs bonus (8 pts)
    if (actionVerbPattern.test(trimmedResume)) {
      score += 8;
    }

    // Quantifiable achievements bonus (7 pts)
    if (quantPattern.test(trimmedResume)) {
      score += 7;
    }

    score = Math.round(Math.min(100, Math.max(0, score)));

    // ── Persist to database ─────────────────────────────────
    // Saves the analysis and all keywords in a single transaction.
    // Non-critical: if persistence fails we still return the result.
    try {
      persistAnalysis(
        trimmedResume,
        hasJD ? trimmedJD : null,
        score,
        matchedKeywords,
        missingKeywords
      );
    } catch (dbErr) {
      console.error('Warning: failed to persist analysis to database:', dbErr.message);
    }

    // ── Response (unchanged) ────────────────────────────────
    return res.status(200).json({
      score,
      matchedKeywords: matchedKeywords.sort(),
      missingKeywords: missingKeywords.sort(),
      sectionsFound,
      sectionsMissing,
      warnings,
    });
  } catch (err) {
    // Pass to global error handler in server.js
    next(err);
  }
});

module.exports = router;
