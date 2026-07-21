/* ============================================================
   RESUME ANALYZER — script.js
   Mock analysis engine · Dynamic DOM rendering · UI state mgmt
   ============================================================ */

(function () {
  'use strict';

  // ── DOM References ──
  const resumeInput   = document.getElementById('resume-input');
  const jdInput       = document.getElementById('jd-input');
  const analyzeBtn    = document.getElementById('analyze-btn');
  const clearBtn      = document.getElementById('clear-btn');
  const resumeCount   = document.getElementById('resume-count');
  const jdCount       = document.getElementById('jd-count');
  const emptyState    = document.getElementById('empty-state');
  const loadingState  = document.getElementById('loading-state');
  const resultsContainer = document.getElementById('results-container');

  // ── Live word-count updates ──
  function countWords(text) {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  resumeInput.addEventListener('input', () => {
    resumeCount.textContent = `${countWords(resumeInput.value)} words`;
  });

  jdInput.addEventListener('input', () => {
    jdCount.textContent = `${countWords(jdInput.value)} words`;
  });

  // ── Analyze button handler ──
  analyzeBtn.addEventListener('click', handleAnalyze);

  // ── Clear button handler ──
  clearBtn.addEventListener('click', () => {
    resumeInput.value = '';
    jdInput.value = '';
    resumeCount.textContent = '0 words';
    jdCount.textContent = '0 words';
    showEmptyState();
  });

  /**
   * Main handler: validates input, shows loading state, runs mock analysis,
   * and renders results into the DOM.
   */
  function handleAnalyze() {
    const resumeText = resumeInput.value.trim();
    if (!resumeText) {
      resumeInput.focus();
      resumeInput.classList.add('shake');
      setTimeout(() => resumeInput.classList.remove('shake'), 500);
      return;
    }

    const jdText = jdInput.value.trim();
    showLoadingState();
    analyzeBtn.disabled = true;

    // Simulate async processing delay (will be replaced by a real API call)
    setTimeout(() => {
      const results = mockAnalyze(resumeText, jdText);
      renderResults(results);
      analyzeBtn.disabled = false;
    }, 1200);
  }

  /* ============================================================
     MOCK ANALYSIS LOGIC
     This entire function will be replaced by a real API call.
     Current implementation:
       1. Extracts unique words from resume & JD
       2. Computes keyword overlap (matched / missing)
       3. Checks for standard resume section headers
       4. Checks word count adequacy
       5. Generates warnings / suggestions
     ============================================================ */
  function mockAnalyze(resumeText, jdText) {
    const hasJD = jdText.length > 0;

    // --- Tokenize both texts into sets of lowercase words ---
    const tokenize = (text) => {
      return new Set(
        text
          .toLowerCase()
          .replace(/[^a-z0-9\s\-\+#]/g, ' ')   // keep letters, digits, hyphens, +, #
          .split(/\s+/)
          .filter((w) => w.length > 2)           // discard very short words
      );
    };

    const resumeWords = tokenize(resumeText);
    const jdWords     = hasJD ? tokenize(jdText) : new Set();

    // --- Keyword matching (only meaningful when JD is present) ---
    // Filter out common stop-words from the JD to get "keywords"
    const stopWords = new Set([
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

    const jdKeywords = new Set(
      [...jdWords].filter((w) => !stopWords.has(w))
    );

    const matched = [];
    const missing = [];

    if (hasJD) {
      for (const keyword of jdKeywords) {
        if (resumeWords.has(keyword)) {
          matched.push(keyword);
        } else {
          missing.push(keyword);
        }
      }
    }

    // --- Section header checks ---
    // Check if the resume contains standard section headings
    const expectedSections = [
      { name: 'Experience',  regex: /\b(experience|work\s+history|employment)\b/i },
      { name: 'Education',   regex: /\b(education|academic|degree|university|college)\b/i },
      { name: 'Skills',      regex: /\b(skills|technologies|tech\s+stack|competencies)\b/i },
      { name: 'Summary',     regex: /\b(summary|objective|profile|about\s+me)\b/i },
      { name: 'Contact',     regex: /\b(email|phone|contact|linkedin|github)\b/i },
    ];

    const foundSections   = [];
    const missingSections  = [];

    for (const section of expectedSections) {
      if (section.regex.test(resumeText)) {
        foundSections.push(section.name);
      } else {
        missingSections.push(section.name);
      }
    }

    // --- Word count check ---
    const wordCount = countWords(resumeText);

    // --- Generate warnings & suggestions ---
    const warnings = [];

    if (wordCount < 150) {
      warnings.push({
        type: 'warning',
        text: `Your resume is very short (${wordCount} words). Aim for at least 300–600 words for a standard one-page resume.`,
      });
    } else if (wordCount < 300) {
      warnings.push({
        type: 'suggestion',
        text: `Your resume has ${wordCount} words. Consider adding more detail to reach 300–600 words.`,
      });
    } else if (wordCount > 1200) {
      warnings.push({
        type: 'warning',
        text: `Your resume is quite long (${wordCount} words). Most recruiters prefer 1–2 pages (300–900 words).`,
      });
    }

    for (const section of missingSections) {
      warnings.push({
        type: 'suggestion',
        text: `Missing section: "${section}". Adding this section can strengthen your resume.`,
      });
    }

    if (hasJD && missing.length > matched.length) {
      warnings.push({
        type: 'warning',
        text: 'More keywords are missing than matched. Try incorporating more terms from the job description.',
      });
    }

    if (!hasJD) {
      warnings.push({
        type: 'suggestion',
        text: 'No job description was provided. Add one for keyword-matching insights.',
      });
    }

    // Check for action verbs
    const actionVerbs = /\b(managed|led|developed|created|designed|implemented|improved|increased|reduced|delivered|built|launched|coordinated|analyzed|optimized)\b/i;
    if (!actionVerbs.test(resumeText)) {
      warnings.push({
        type: 'suggestion',
        text: 'Consider using strong action verbs (e.g., "managed," "developed," "implemented") to describe your accomplishments.',
      });
    }

    // Check for quantifiable achievements
    const hasNumbers = /\d+%|\$\d+|\d+\s*(users|clients|projects|team|people|revenue)/i;
    if (!hasNumbers.test(resumeText)) {
      warnings.push({
        type: 'suggestion',
        text: 'Add quantifiable achievements (e.g., "increased revenue by 20%") to make your impact tangible.',
      });
    }

    // --- Compute overall score (0–100) ---
    let score = 0;

    // Section completeness: up to 30 pts
    score += (foundSections.length / expectedSections.length) * 30;

    // Word count adequacy: up to 20 pts
    if (wordCount >= 300 && wordCount <= 900) {
      score += 20;
    } else if (wordCount >= 150 && wordCount < 300) {
      score += 12;
    } else if (wordCount > 900 && wordCount <= 1200) {
      score += 14;
    } else {
      score += 5;
    }

    // Keyword match ratio: up to 35 pts (only when JD present)
    if (hasJD && jdKeywords.size > 0) {
      const matchRatio = matched.length / jdKeywords.size;
      score += matchRatio * 35;
    } else {
      // Without JD, give a neutral baseline
      score += 15;
    }

    // Action verbs bonus: up to 8 pts
    if (actionVerbs.test(resumeText)) {
      score += 8;
    }

    // Quantifiable achievements bonus: up to 7 pts
    if (hasNumbers.test(resumeText)) {
      score += 7;
    }

    score = Math.round(Math.min(100, Math.max(0, score)));

    return {
      score,
      hasJD,
      wordCount,
      matched: matched.sort(),
      missing: missing.sort().slice(0, 30), // cap displayed missing keywords
      foundSections,
      missingSections,
      warnings,
    };
  }

  /* ============================================================
     DOM RENDERING
     All elements are created with document.createElement() and
     textContent to avoid innerHTML / XSS risks.
     ============================================================ */

  function renderResults(results) {
    // Clear previous results
    while (resultsContainer.firstChild) {
      resultsContainer.removeChild(resultsContainer.firstChild);
    }

    // 1. Score card
    resultsContainer.appendChild(createScoreCard(results.score));

    // 2. "No JD provided" notice
    if (!results.hasJD) {
      resultsContainer.appendChild(createNotice(
        'ℹ️',
        'No job description provided — keyword matching is unavailable. Only structural analysis was performed.'
      ));
    }

    // 3. Matched keywords (only if JD was provided)
    if (results.hasJD) {
      resultsContainer.appendChild(
        createChipCard('✓', 'Matched Keywords', results.matched, 'matched')
      );
    }

    // 4. Missing keywords (only if JD was provided)
    if (results.hasJD) {
      resultsContainer.appendChild(
        createChipCard('✗', 'Missing Keywords', results.missing, 'missing')
      );
    }

    // 5. Warnings & suggestions
    if (results.warnings.length > 0) {
      resultsContainer.appendChild(createWarningsCard(results.warnings));
    }

    // Show results, hide others
    emptyState.classList.add('hidden');
    loadingState.classList.add('hidden');
    resultsContainer.classList.remove('hidden');
  }

  /* ── Score Card ── */
  function createScoreCard(score) {
    const card = document.createElement('div');
    card.className = 'score-card result-card';

    // Determine color based on score
    let color;
    let label;
    if (score >= 75) {
      color = 'var(--clr-accent)';
      label = 'Excellent';
    } else if (score >= 50) {
      color = 'var(--clr-warning)';
      label = 'Needs Improvement';
    } else {
      color = 'var(--clr-danger)';
      label = 'Weak — Needs Work';
    }

    // SVG ring
    const circumference = 2 * Math.PI * 54; // r=54
    const offset = circumference - (score / 100) * circumference;

    const ring = document.createElement('div');
    ring.className = 'score-ring';
    ring.setAttribute('role', 'img');
    ring.setAttribute('aria-label', `Score: ${score} out of 100`);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '130');
    svg.setAttribute('height', '130');
    svg.setAttribute('viewBox', '0 0 120 120');

    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('cx', '60');
    bgCircle.setAttribute('cy', '60');
    bgCircle.setAttribute('r', '54');
    bgCircle.classList.add('score-ring-bg');

    const fillCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    fillCircle.setAttribute('cx', '60');
    fillCircle.setAttribute('cy', '60');
    fillCircle.setAttribute('r', '54');
    fillCircle.classList.add('score-ring-fill');
    fillCircle.style.stroke = color;
    fillCircle.style.strokeDasharray = `${circumference}`;
    fillCircle.style.strokeDashoffset = `${circumference}`; // start empty

    svg.appendChild(bgCircle);
    svg.appendChild(fillCircle);
    ring.appendChild(svg);

    // Score number
    const valueDiv = document.createElement('div');
    valueDiv.className = 'score-value';
    valueDiv.style.color = color;

    const numberSpan = document.createElement('span');
    numberSpan.textContent = score;

    const unitSmall = document.createElement('small');
    unitSmall.textContent = '/ 100';

    valueDiv.appendChild(numberSpan);
    valueDiv.appendChild(unitSmall);
    ring.appendChild(valueDiv);

    card.appendChild(ring);

    // Label
    const labelEl = document.createElement('p');
    labelEl.className = 'score-label';
    labelEl.textContent = label;
    card.appendChild(labelEl);

    // Animate the ring fill after a small delay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fillCircle.style.strokeDashoffset = `${offset}`;
      });
    });

    return card;
  }

  /* ── Chip-based keyword card (matched / missing) ── */
  function createChipCard(icon, title, keywords, type) {
    const card = document.createElement('div');
    card.className = 'result-card';

    // Header
    const header = document.createElement('div');
    header.className = 'card-header';

    const iconDiv = document.createElement('div');
    iconDiv.className = `card-icon ${type}`;
    iconDiv.textContent = icon;

    const titleEl = document.createElement('h3');
    titleEl.className = 'card-title';
    titleEl.textContent = title;

    const countEl = document.createElement('span');
    countEl.className = 'card-count';
    countEl.textContent = `${keywords.length} keyword${keywords.length !== 1 ? 's' : ''}`;

    header.appendChild(iconDiv);
    header.appendChild(titleEl);
    header.appendChild(countEl);
    card.appendChild(header);

    // Chips
    if (keywords.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.style.cssText = 'font-size:var(--fs-sm);color:var(--clr-text-dim);';
      emptyMsg.textContent = type === 'matched'
        ? 'No matching keywords found.'
        : 'Great — no missing keywords!';
      card.appendChild(emptyMsg);
    } else {
      const chipList = document.createElement('div');
      chipList.className = 'chip-list';

      keywords.forEach((kw, i) => {
        const chip = document.createElement('span');
        chip.className = `chip ${type}`;
        chip.textContent = kw;
        chip.style.animationDelay = `${i * 0.03}s`;
        chipList.appendChild(chip);
      });

      card.appendChild(chipList);
    }

    return card;
  }

  /* ── Warnings / Suggestions card ── */
  function createWarningsCard(warnings) {
    const card = document.createElement('div');
    card.className = 'result-card';

    // Header
    const header = document.createElement('div');
    header.className = 'card-header';

    const iconDiv = document.createElement('div');
    iconDiv.className = 'card-icon warnings';
    iconDiv.textContent = '⚠';

    const titleEl = document.createElement('h3');
    titleEl.className = 'card-title';
    titleEl.textContent = 'Warnings & Suggestions';

    const countEl = document.createElement('span');
    countEl.className = 'card-count';
    countEl.textContent = `${warnings.length} item${warnings.length !== 1 ? 's' : ''}`;

    header.appendChild(iconDiv);
    header.appendChild(titleEl);
    header.appendChild(countEl);
    card.appendChild(header);

    // List
    const list = document.createElement('div');
    list.className = 'warnings-list';

    warnings.forEach((w) => {
      const item = document.createElement('div');
      item.className = `warning-item ${w.type}`;

      const bullet = document.createElement('span');
      bullet.className = 'warning-bullet';
      bullet.setAttribute('aria-hidden', 'true');
      bullet.textContent = w.type === 'warning' ? '⚠️' : '💡';

      const text = document.createElement('span');
      text.textContent = w.text;

      item.appendChild(bullet);
      item.appendChild(text);
      list.appendChild(item);
    });

    card.appendChild(list);
    return card;
  }

  /* ── Notice banner ── */
  function createNotice(icon, message) {
    const notice = document.createElement('div');
    notice.className = 'notice';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'notice-icon';
    iconSpan.textContent = icon;

    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;

    notice.appendChild(iconSpan);
    notice.appendChild(msgSpan);
    return notice;
  }

  /* ── UI State Helpers ── */
  function showEmptyState() {
    emptyState.classList.remove('hidden');
    loadingState.classList.add('hidden');
    resultsContainer.classList.add('hidden');
  }

  function showLoadingState() {
    emptyState.classList.add('hidden');
    loadingState.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
  }

})();
