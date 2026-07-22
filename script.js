const API_BASE = 'http://localhost:3001/api';

const resumeInput = document.getElementById('resume-input');
const jdInput = document.getElementById('jd-input');
const analyzeBtn = document.getElementById('analyze-btn');
const clearBtn = document.getElementById('clear-btn');
const resumeCount = document.getElementById('resume-count');
const jdCount = document.getElementById('jd-count');
const emptyState = document.getElementById('empty-state');
const loadingState = document.getElementById('loading-state');
const resultsContainer = document.getElementById('results-container');
const appGrid = document.querySelector('.app-grid');
const resultsSection = document.getElementById('results-section');

const pastAnalysesSection = document.createElement('section');
pastAnalysesSection.className = 'past-analyses-section';
pastAnalysesSection.innerHTML = `
  <div class="section-header">
    <h2>Past Analyses</h2>
    <p>Review, reopen, or remove saved analyses.</p>
  </div>
  <div id="past-analyses-list" class="past-analyses-list"></div>
`;

appGrid.insertBefore(pastAnalysesSection, resultsSection);

const pastAnalysesList = document.getElementById('past-analyses-list');

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

function updateCounts() {
  resumeCount.textContent = `${countWords(resumeInput.value)} words`;
  jdCount.textContent = `${countWords(jdInput.value)} words`;
}

function showEmptyState() {
  emptyState.innerHTML = `
    <div class="empty-icon">∿</div>
    <h2 id="results-heading" class="empty-title">No Analysis Yet</h2>
    <p class="empty-description">Paste a resume and optional job description to get started.</p>
  `;
  emptyState.classList.remove('hidden');
  loadingState.classList.add('hidden');
  resultsContainer.classList.add('hidden');
}

function showLoadingState() {
  emptyState.classList.add('hidden');
  loadingState.classList.remove('hidden');
  resultsContainer.classList.add('hidden');
}

function showError(message) {
  emptyState.innerHTML = `
    <div class="empty-icon">!</div>
    <h2 id="results-heading" class="empty-title">Analysis Failed</h2>
    <p class="empty-description">${message}</p>
  `;
  emptyState.classList.remove('hidden');
  loadingState.classList.add('hidden');
  resultsContainer.classList.add('hidden');
}

function createCard(title, content) {
  const card = document.createElement('div');
  card.className = 'result-card';
  card.innerHTML = `<h3>${title}</h3>`;

  if (Array.isArray(content)) {
    const list = document.createElement('ul');
    list.className = 'result-list';
    content.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
    card.appendChild(list);
  } else {
    const paragraph = document.createElement('p');
    paragraph.textContent = content;
    card.appendChild(paragraph);
  }

  return card;
}

function renderResults(results) {
  resultsContainer.replaceChildren();

  const scoreCard = document.createElement('div');
  scoreCard.className = 'score-card';
  scoreCard.innerHTML = `<h3>Score</h3><div class="score-value">${results.score}</div>`;
  resultsContainer.appendChild(scoreCard);

  if (!results.hasJD) {
    resultsContainer.appendChild(createCard('Job Description', 'No job description provided.'));
  }

  resultsContainer.appendChild(createCard('Matched Keywords', results.matchedKeywords.length ? results.matchedKeywords : ['None']));
  resultsContainer.appendChild(createCard('Missing Keywords', results.missingKeywords.length ? results.missingKeywords : ['None']));
  resultsContainer.appendChild(createCard('Sections Found', results.sectionsFound.length ? results.sectionsFound : ['None']));
  resultsContainer.appendChild(createCard('Sections Missing', results.sectionsMissing.length ? results.sectionsMissing : ['None']));

  if (results.warnings.length > 0) {
    resultsContainer.appendChild(createCard('Warnings', results.warnings.map((warning) => warning.text)));
  }

  emptyState.classList.add('hidden');
  loadingState.classList.add('hidden');
  resultsContainer.classList.remove('hidden');
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  if (!response.ok) {
    const message = body?.message || body?.error || `Request failed with status ${response.status}`;
    throw new Error(`${response.status}: ${message}`);
  }

  return body;
}

async function loadPastAnalyses() {
  pastAnalysesList.innerHTML = '<p class="empty-description">Loading past analyses...</p>';

  try {
    const analyses = await fetchJson(`${API_BASE}/analyses`);

    if (!analyses.length) {
      pastAnalysesList.innerHTML = '<p class="empty-description">No past analyses yet</p>';
      return;
    }

    pastAnalysesList.replaceChildren();

    analyses.forEach((analysis) => {
      const row = document.createElement('div');
      row.className = 'past-analysis-item';

      const openButton = document.createElement('button');
      openButton.type = 'button';
      openButton.className = 'past-analysis-open';
      openButton.textContent = `Score ${analysis.score} • ${new Date(analysis.created_at).toLocaleString()}`;
      openButton.addEventListener('click', () => loadAnalysisDetail(analysis.id));

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'past-analysis-delete';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', async () => {
        try {
          deleteButton.disabled = true;
          await fetchJson(`${API_BASE}/analyses/${analysis.id}`, { method: 'DELETE' });
          row.remove();
          if (!pastAnalysesList.children.length) {
            pastAnalysesList.innerHTML = '<p class="empty-description">No past analyses yet</p>';
          }
        } catch (error) {
          deleteButton.disabled = false;
          showError(`Could not delete analysis ${analysis.id}. ${error.message}`);
        }
      });

      row.appendChild(openButton);
      row.appendChild(deleteButton);
      pastAnalysesList.appendChild(row);
    });
  } catch (error) {
    pastAnalysesList.innerHTML = `<p class="empty-description">Could not load past analyses. ${error.message}</p>`;
  }
}

async function loadAnalysisDetail(id) {
  showLoadingState();

  try {
    const analysis = await fetchJson(`${API_BASE}/analyses/${id}`);
    renderResults(analysis);
  } catch (error) {
    showError(`Could not load analysis ${id}. ${error.message}`);
  }
}

async function handleAnalyze() {
  const resumeText = resumeInput.value.trim();
  if (!resumeText) {
    resumeInput.focus();
    resumeInput.classList.add('shake');
    setTimeout(() => resumeInput.classList.remove('shake'), 500);
    return;
  }

  const jobDescription = jdInput.value.trim();
  showLoadingState();
  analyzeBtn.disabled = true;

  try {
    const analysis = await fetchJson(`${API_BASE}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ resumeText, jobDescription }),
    });

    renderResults(analysis);
    await loadPastAnalyses();
  } catch (error) {
    showError(error.message);
  } finally {
    analyzeBtn.disabled = false;
    loadingState.classList.add('hidden');
  }
}

analyzeBtn.addEventListener('click', handleAnalyze);
resumeInput.addEventListener('input', updateCounts);
jdInput.addEventListener('input', updateCounts);

clearBtn.addEventListener('click', () => {
  resumeInput.value = '';
  jdInput.value = '';
  updateCounts();
  showEmptyState();
});

showEmptyState();
updateCounts();
loadPastAnalyses();
