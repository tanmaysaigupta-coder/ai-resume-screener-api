const { z } = require('zod');
const { pool } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');

const jobSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().min(10),
  requiredSkills: z.array(z.string()).default([]),
  minExperienceYears: z.number().int().min(0).default(0),
});

async function createJob(req, res, next) {
  try {
    const data = jobSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO job_postings (owner_id, title, description, required_skills, min_experience_years)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.sub, data.title, data.description, data.requiredSkills, data.minExperienceYears]
    );
    res.status(201).json({ job: result.rows[0] });
  } catch (err) {
    if (err.name === 'ZodError') return next(new ApiError(400, 'Invalid input', err.issues));
    return next(err);
  }
}

async function listJobs(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT * FROM job_postings WHERE owner_id = $1 ORDER BY created_at DESC',
      [req.user.sub]
    );
    res.json({ jobs: result.rows });
  } catch (err) {
    next(err);
  }
}

async function getJob(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT * FROM job_postings WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.user.sub]
    );
    if (result.rows.length === 0) throw new ApiError(404, 'Job posting not found');
    res.json({ job: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { createJob, listJobs, getJob };
