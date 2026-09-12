# AI Resume Screener API

A backend REST API for recruiters to post jobs, collect candidate resumes, and automatically screen each resume against the job description using an LLM. Built with Node.js, Express, and PostgreSQL.

## Why this project

Recruiters manually reading every resume against a job description does not scale. This API lets a recruiter create a job posting, attach candidate resumes, and get back a structured score, verdict, and explanation for each candidate in seconds, powered by an LLM (Groq).

## Features

- JWT-based authentication (register / login)
- CRUD for job postings, scoped to the authenticated recruiter
- Candidate intake per job posting
- LLM-powered resume screening: returns a 0-100 score, a verdict (`strong_match` / `possible_match` / `not_a_match`), a summary, and matched/missing skills
- Input validation with Zod
- Centralized error handling with consistent JSON error shape
- Security middleware (Helmet, CORS, rate limiting)
- PostgreSQL persistence with a plain SQL schema (no ORM)
- Dockerfile + docker-compose for one-command local setup
- Jest + Supertest test suite (11 tests, DB and LLM calls mocked)
- GitHub Actions CI running the test suite on Node 18 and 20

## Tech stack

Node.js, Express, PostgreSQL, JWT, Zod, Groq SDK (LLM), Jest, Supertest, Docker.

## Architecture

```
Client
  |
  v
Express app (helmet, cors, rate limiting)
  |
  |-- /api/auth        -> authController        -> users table
  |
  `-- /api/jobs         -> jobController         -> job_postings table
       `-- /:jobId/candidates
            |-- addCandidate     -> candidateController -> candidates table
            |-- listCandidates   -> candidateController -> candidates table
            `-- :id/screen       -> candidateController -> llmService (Groq) -> candidates table
```

Each job posting belongs to a recruiter (`owner_id`). Candidates belong to a job posting. Screening a candidate sends the job description plus the candidate's resume text to the LLM, which returns a structured evaluation that is stored back on the candidate row.

## Getting started

### 1. With Docker (recommended)

```bash
cp .env.example .env
# edit .env and set GROQ_API_KEY and JWT_SECRET

docker compose up --build
```

The API will be available at `http://localhost:4000`, with PostgreSQL running alongside it.

### 2. Locally

Requires Node.js 18+ and a running PostgreSQL instance.

```bash
npm install
cp .env.example .env
# edit .env with your DATABASE_URL, JWT_SECRET, and GROQ_API_KEY

npm run migrate   # applies src/db/schema.sql
npm run dev        # starts the API with nodemon
```

### Running tests

```bash
npm test
```

Tests mock the database and the LLM client, so no PostgreSQL instance or Groq API key is required to run the suite.

## API reference

All `/api/jobs` routes require `Authorization: Bearer <token>`.

### Auth

| Method | Route | Body | Description |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` | Create an account, returns `{ user, token }` |
| POST | `/api/auth/login` | `{ email, password }` | Log in, returns `{ user, token }` |

### Job postings

| Method | Route | Body | Description |
|---|---|---|---|
| POST | `/api/jobs` | `{ title, description, requiredSkills[], minExperienceYears }` | Create a job posting |
| GET | `/api/jobs` | - | List the authenticated recruiter's job postings |
| GET | `/api/jobs/:id` | - | Get a single job posting |

### Candidates

| Method | Route | Body | Description |
|---|---|---|---|
| POST | `/api/jobs/:jobId/candidates` | `{ name, email, resumeText }` | Add a candidate to a job posting |
| GET | `/api/jobs/:jobId/candidates` | - | List candidates for a job, ranked by screening score |
| POST | `/api/jobs/:jobId/candidates/:candidateId/screen` | - | Run LLM screening for a candidate |

### Example: end-to-end flow

```bash
# 1. Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Tanmay","email":"tanmay@example.com","password":"supersecret123"}'

# 2. Create a job posting (use the token from step 1)
curl -X POST http://localhost:4000/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title":"Backend Engineer","description":"Build and scale our REST APIs.","requiredSkills":["Node.js","PostgreSQL"],"minExperienceYears":2}'

# 3. Add a candidate
curl -X POST http://localhost:4000/api/jobs/1/candidates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Alex Doe","email":"alex@example.com","resumeText":"5 years building Node.js and Express APIs on PostgreSQL..."}'

# 4. Screen the candidate
curl -X POST http://localhost:4000/api/jobs/1/candidates/1/screen \
  -H "Authorization: Bearer <token>"
```

## Project structure

```
src/
  app.js               Express app setup and route mounting
  server.js             Entry point
  config/db.js           PostgreSQL connection pool
  db/schema.sql           Database schema
  db/migrate.js           Migration runner
  middleware/auth.js       JWT auth middleware
  middleware/errorHandler.js  Centralized error handling
  controllers/            Route handlers
  routes/                 Express routers
  services/llmService.js   LLM screening logic (Groq)
tests/                    Jest + Supertest test suite
```

## License

MIT
