# Resume Analyzer API

A lightweight REST API for analyzing resumes against job descriptions. Built with **Node.js**, **Express**, and **SQLite** (via `better-sqlite3`).

## Quick Start

```bash
# Install dependencies (includes better-sqlite3 native module)
npm install

# Start the server (port 3001 by default)
npm start

# Or run in dev mode with auto-restart on file changes (Node 18+)
npm run dev
```

The server starts at **http://localhost:3001**.  
The SQLite database (`db/resume_analyzer.db`) is created automatically on first startup.

## Database Schema

```
┌──────────────────────────────────────────────────────┐
│  analyses                                            │
├──────────────────────────────────────────────────────┤
│  id              INTEGER  PRIMARY KEY AUTOINCREMENT  │
│  resume_text     TEXT     NOT NULL                   │
│  job_description TEXT     (nullable)                 │
│  score           INTEGER  NOT NULL  CHECK(0..100)    │
│  created_at      TEXT     DEFAULT current timestamp  │
└──────────────────────────────────────────────────────┘
        │
        │ 1:N (ON DELETE CASCADE)
        ▼
┌──────────────────────────────────────────────────────┐
│  analysis_keywords                                   │
├──────────────────────────────────────────────────────┤
│  id              INTEGER  PRIMARY KEY AUTOINCREMENT  │
│  analysis_id     INTEGER  FK → analyses.id           │
│  keyword         TEXT     NOT NULL                   │
│  matched         INTEGER  0 or 1 (boolean)           │
└──────────────────────────────────────────────────────┘
```

The schema is defined in `db/schema.sql` and applied automatically on startup via `CREATE TABLE IF NOT EXISTS`.

## Endpoints

### `GET /api/health`

Health check.

```bash
curl http://localhost:3001/api/health
```

**Response** `200`:
```json
{ "status": "ok" }
```

---

### `POST /api/analyze`

Analyze a resume, optionally against a job description. Results are persisted to SQLite automatically.

**Request body** (`Content-Type: application/json`):

| Field            | Type   | Required | Description                              |
|------------------|--------|----------|------------------------------------------|
| `resumeText`     | string | ✅ yes   | The full text of the resume (≥50 chars)  |
| `jobDescription` | string | no       | Target job description for keyword match |

#### Example — with job description

```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "resumeText": "John Doe — Software Engineer\n\nSummary\nExperienced software engineer with 5 years building scalable web applications.\n\nExperience\nSenior Developer at Acme Corp (2020–2024)\n- Developed and maintained microservices using Node.js and Python\n- Improved API response times by 40%\n- Led a team of 4 engineers\n\nEducation\nB.S. Computer Science, State University, 2019\n\nSkills\nJavaScript, TypeScript, Python, React, Node.js, PostgreSQL, Docker, AWS\n\nProjects\nOpen-source CLI tool for database migrations (500+ GitHub stars)",
    "jobDescription": "We are looking for a software engineer with experience in JavaScript, TypeScript, React, Node.js, Python, and AWS. Experience with Docker and microservices architecture is a plus."
  }'
```

#### Example — without job description

```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "resumeText": "Jane Smith — Data Analyst\n\nSummary\nDetail-oriented data analyst with 3 years of experience.\n\nExperience\nData Analyst at BigCo (2021–2024)\n- Analyzed customer data to identify trends\n- Created dashboards using Tableau\n\nEducation\nM.S. Statistics, University of Example, 2021\n\nSkills\nPython, SQL, Tableau, Excel, R"
  }'
```

#### Example — validation error (too short)

```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{ "resumeText": "Too short" }'
```

**Success Response** `200`:
```json
{
  "score": 82,
  "matchedKeywords": ["aws", "docker", "javascript", "microservices", "node.js", "python", "react", "typescript"],
  "missingKeywords": ["architecture"],
  "sectionsFound": ["Experience", "Education", "Skills", "Projects", "Summary"],
  "sectionsMissing": [],
  "warnings": []
}
```

**Error Response** `400`:
```json
{
  "error": "Validation failed",
  "message": "Resume text is too short (9 characters). Please provide at least 50 characters."
}
```

---

### `GET /api/analyses`

List all past analyses (lightweight — no resume text).

```bash
curl http://localhost:3001/api/analyses
```

**Response** `200`:
```json
[
  { "id": 3, "score": 82, "created_at": "2026-07-21 18:30:00" },
  { "id": 2, "score": 65, "created_at": "2026-07-21 17:15:00" },
  { "id": 1, "score": 48, "created_at": "2026-07-21 16:00:00" }
]
```

---

### `GET /api/analyses/:id`

Get a full analysis with keywords.

```bash
curl http://localhost:3001/api/analyses/1
```

**Response** `200`:
```json
{
  "id": 1,
  "score": 82,
  "resume_text": "John Doe — Software Engineer...",
  "job_description": "We are looking for...",
  "created_at": "2026-07-21 18:30:00",
  "matchedKeywords": ["aws", "docker", "javascript"],
  "missingKeywords": ["architecture"]
}
```

**Response** `404`:
```json
{
  "error": "Not found",
  "message": "No analysis found with id 999."
}
```

---

### `DELETE /api/analyses/:id`

Delete an analysis and its associated keywords (cascaded).

```bash
curl -X DELETE http://localhost:3001/api/analyses/1
```

**Response** `200`:
```json
{
  "message": "Analysis 1 deleted successfully."
}
```

**Response** `404`:
```json
{
  "error": "Not found",
  "message": "No analysis found with id 1."
}
```

## Project Structure

```
backend/
├── server.js              # Express app, middleware, error handling
├── routes/
│   ├── analyze.js         # POST /api/analyze — analysis logic + persistence
│   └── analyses.js        # GET/DELETE /api/analyses — CRUD for past analyses
├── db/
│   ├── schema.sql         # Table definitions (analyses, analysis_keywords)
│   ├── db.js              # SQLite init, prepared statements, helpers
│   └── resume_analyzer.db # SQLite database file (auto-created, gitignored)
├── package.json
└── README.md
```

## Scoring Breakdown

| Factor                  | Max Points |
|-------------------------|-----------|
| Section completeness    | 30        |
| Word count adequacy     | 20        |
| Keyword match ratio     | 35        |
| Action verbs present    | 8         |
| Quantifiable results    | 7         |
| **Total**               | **100**   |

*When no job description is provided, keyword matching scores a neutral 15/35.*

## Configuration

| Variable | Default | Description         |
|----------|---------|---------------------|
| `PORT`   | `3001`  | Server listen port  |
| `NODE_ENV` | —     | Set to `production` to hide error details |
