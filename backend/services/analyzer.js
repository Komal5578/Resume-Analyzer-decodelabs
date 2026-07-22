const STOP_WORDS = new Set([
  'the','and','for','are','but','not','you','all','can','had','her',
  'was','one','our','out','has','with','that','this','from','they',
  'been','have','will','your','what','when','make','like','just',
  'over','such','take','than','them','very','some','into','most',
  'other','would','about','their','which','could','more','also',
  'should','after','being','those','because','where','between',
  'each','does','these','while','must','through','before','same',
  'work','able','using','used','who','how','may','any','new','per',
  'including','well','within','both','under','based','strong',
  'looking','ideal','plus','role','team','join','company','position',
  'opportunity','responsibilities','requirements','qualifications',
  'preferred','required','experience','years','knowledge','ability',
]);

const EXPECTED_SECTIONS = [
  { name: 'Experience', regex: /\b(experience|work\s+history|employment)\b/i },
  { name: 'Education', regex: /\b(education|academic|degree|university|college)\b/i },
  { name: 'Skills', regex: /\b(skills|technologies|tech\s+stack|competencies)\b/i },
  { name: 'Summary', regex: /\b(summary|objective|profile|about\s+me)\b/i },
  { name: 'Contact', regex: /\b(email|phone|contact|linkedin|github)\b/i },
];

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-+#]/g, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/^[.\-]+|[.\-]+$/g, ''))
    .filter((word) => word.length > 2);
}

function analyzeResume(resumeText, jobDescription) {
  const trimmedResume = resumeText.trim();
  const hasJD = typeof jobDescription === 'string' && jobDescription.trim().length > 0;
  const trimmedJD = hasJD ? jobDescription.trim() : '';
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

  const matchedKeywords = [];
  const missingKeywords = [];
  for (const keyword of jdKeywords) {
    if (resumeTokens.has(keyword)) {
      matchedKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  }

  const sectionsFound = [];
  const sectionsMissing = [];
  for (const section of EXPECTED_SECTIONS) {
    if (section.regex.test(trimmedResume)) {
      sectionsFound.push(section.name);
    } else {
      sectionsMissing.push(section.name);
    }
  }

  const wordCount = trimmedResume.split(/\s+/).filter(Boolean).length;
  const warnings = [];

  for (const name of sectionsMissing) {
    warnings.push({ type: 'suggestion', text: `No "${name}" section detected.` });
  }

  if (wordCount < 100) {
    warnings.push({
      type: 'warning',
      text: `Resume is very short (${wordCount} words). Aim for at least 300 words for a standard resume.`,
    });
  } else if (wordCount < 300) {
    warnings.push({
      type: 'suggestion',
      text: `Resume is shorter than recommended (${wordCount} words). Consider expanding to 300–600 words.`,
    });
  } else if (wordCount > 1200) {
    warnings.push({
      type: 'warning',
      text: `Resume is quite long (${wordCount} words). Most recruiters prefer 1–2 pages (300–900 words).`,
    });
  }

  if (hasJD && jdKeywords.length > 0 && missingKeywords.length > matchedKeywords.length) {
    warnings.push({
      type: 'warning',
      text: 'More job description keywords are missing than matched. Try incorporating more relevant terms.',
    });
  }

  if (!hasJD) {
    warnings.push({
      type: 'suggestion',
      text: 'No job description provided. Keyword matching was skipped; only structural analysis was performed.',
    });
  }

  const actionVerbPattern = /\b(managed|led|developed|created|designed|implemented|improved|increased|reduced|delivered|built|launched|coordinated|analyzed|optimized|architected|mentored|negotiated|streamlined)\b/i;
  if (!actionVerbPattern.test(trimmedResume)) {
    warnings.push({
      type: 'suggestion',
      text: 'Consider using strong action verbs (e.g., "managed," "developed," "implemented") to describe accomplishments.',
    });
  }

  const quantPattern = /\d+\s*%|\$\s*[\d,]+|\d+\s*(users|clients|projects|team|people|revenue|customers)/i;
  if (!quantPattern.test(trimmedResume)) {
    warnings.push({
      type: 'suggestion',
      text: 'Add quantifiable achievements (e.g., "increased revenue by 20%") to strengthen impact.',
    });
  }

  let score = 0;
  score += (sectionsFound.length / EXPECTED_SECTIONS.length) * 30;

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

  if (hasJD && jdKeywords.length > 0) {
    const matchRatio = matchedKeywords.length / jdKeywords.length;
    score += matchRatio * 35;
  } else {
    score += 15;
  }

  if (actionVerbPattern.test(trimmedResume)) {
    score += 8;
  }

  if (quantPattern.test(trimmedResume)) {
    score += 7;
  }

  score = Math.round(Math.min(100, Math.max(0, score)));

  return {
    score,
    hasJD,
    wordCount,
    matchedKeywords: matchedKeywords.sort(),
    missingKeywords: missingKeywords.sort().slice(0, 30),
    sectionsFound,
    sectionsMissing,
    warnings,
  };
}

module.exports = {
  analyzeResume,
};
