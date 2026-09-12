const { z } = require('zod');
const { pool } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { screenResume } = require('../services/llmService');

const candidateSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  resumeText: z.string().min(20),
});

async function getOwnedJob(jobId, ownerId) {
  const result = await pool.query(
    'SELECT * FROM job_postings WHERE id = $1 AND owner_id = $2',
    [jobId, ownerId]
  );
  return result.rows[0];
}

async function addCandidate(req, res, next) {
  try {
    const job = await getOwnedJob(req.params.jobId, req.user.sub);
    if (!job) throw new ApiError(404, 'Job posting not found');

    const data = candidateSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO candidates (job_id, name, email, resume_text) VALUES ($1, $2, $3, $4) RETURNING *`,
      [job.id, data.name, data.email, data.resumeText]
    );
    res.status(201).json({ candidate: result.rows[0] });
  } catch (err) {
    if (err.name === 'ZodError') return next(new ApiError(400, 'Invalid input', err.issues));
    return next(err);
  }
}

async function listCandidates(req, res, next) {
  try {
    const job = await getOwnedJob(req.params.jobId, req.user.sub);
    if (!job) throw new ApiError(404, 'Job posting not found');

    const result = await pool.query(
      'SELECT * FROM candidates WHERE job_id = $1 ORDER BY screening_score DESC NULLS LAST, created_at DESC',
      [job.id]
    );
    res.json({ candidates: result.rows });
  } catch (err) {
    next(err);
  }
}

async function screenCandidate(req, res, next) {
  try {
    const job = await getOwnedJob(req.params.jobId, req.user.sub);
    if (!job) throw new ApiError(404, 'Job posting not found');

    const candidateResult = await pool.query(
      'SELECT * FROM candidates WHERE id = $1 AND job_id = $2',
      [req.params.candidateId, job.id]
    );
    const candidate = candidateResult.rows[0];
    if (!candidate) throw new ApiError(404, 'Candidate not found');

    const screening = await screenResume(job, candidate.resume_text);

    const updated = await pool.query(
      `UPDATE candidates
       SET screening_score = $1, screening_verdict = $2, screening_summary = $3, screened_at = now()
       WHERE id = $4 RETURNING *`,
      [screening.score, screening.verdict, screening.summary, candidate.id]
    );

    res.json({
      candidate: updated.rows[0],
      matchedSkills: screening.matchedSkills,
      missingSkills: screening.missingSkills,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { addCandidate, listCandidates, screenCandidate };
