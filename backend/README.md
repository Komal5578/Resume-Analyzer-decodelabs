# Resume Analyzer API

A lightweight REST API for analyzing resumes against job descriptions. Built with **Node.js** and **Express**.

## Quick Start

```bash
# Install dependencies
npm install

# Start the server (port 3001 by default)
npm start

# Or run in dev mode with auto-restart on file changes (Node 18+)
npm run dev
```

The server starts at **http://localhost:3001**.

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

Analyze a resume, optionally against a job description.

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

## Project Structure

```
backend/
├── server.js          # Express app, middleware, error handling
├── routes/
│   └── analyze.js     # POST /api/analyze route & analysis logic
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
