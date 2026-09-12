jest.mock('../src/config/db', () => ({
  pool: { query: jest.fn() },
}));
jest.mock('../src/services/llmService', () => ({
  screenResume: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { pool } = require('../src/config/db');
const { screenResume } = require('../src/services/llmService');

function authHeader() {
  const token = jwt.sign({ sub: 1, email: 'tanmay@example.com', role: 'recruiter' }, process.env.JWT_SECRET);
  return `Bearer ${token}`;
}

describe('Job postings', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  it('requires authentication', async () => {
    const app = createApp();
    const res = await request(app).get('/api/jobs');
    expect(res.status).toBe(401);
  });

  it('creates a job posting for the authenticated user', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 10, title: 'Backend Engineer', description: 'Build APIs', required_skills: ['Node.js'] }],
    });

    const app = createApp();
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', authHeader())
      .send({
        title: 'Backend Engineer',
        description: 'Build APIs',
        requiredSkills: ['Node.js'],
        minExperienceYears: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.job.title).toBe('Backend Engineer');
  });
});

describe('Candidate screening', () => {
  beforeEach(() => {
    pool.query.mockReset();
    screenResume.mockReset();
  });

  it('screens a candidate against the job and stores the result', async () => {
    const job = { id: 10, owner_id: 1, title: 'Backend Engineer', description: 'Build APIs', required_skills: ['Node.js'], min_experience_years: 2 };
    const candidate = { id: 5, job_id: 10, name: 'Alex', email: 'alex@example.com', resume_text: '5 years Node.js and PostgreSQL experience' };

    pool.query
      .mockResolvedValueOnce({ rows: [job] }) // getOwnedJob
      .mockResolvedValueOnce({ rows: [candidate] }) // candidate lookup
      .mockResolvedValueOnce({
        rows: [{ ...candidate, screening_score: 88, screening_verdict: 'strong_match', screening_summary: 'Great fit.' }],
      }); // update

    screenResume.mockResolvedValueOnce({
      score: 88,
      verdict: 'strong_match',
      summary: 'Great fit.',
      matchedSkills: ['Node.js'],
      missingSkills: [],
    });

    const app = createApp();
    const res = await request(app)
      .post('/api/jobs/10/candidates/5/screen')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.candidate.screening_score).toBe(88);
    expect(res.body.candidate.screening_verdict).toBe('strong_match');
    expect(screenResume).toHaveBeenCalledWith(job, candidate.resume_text);
  });

  it('returns 404 when the job does not belong to the user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const app = createApp();
    const res = await request(app)
      .post('/api/jobs/999/candidates/5/screen')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });
});
