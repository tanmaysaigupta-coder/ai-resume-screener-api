const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { pool } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');

const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (existing.rows.length > 0) {
      throw new ApiError(409, 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id, name, email, role, created_at`,
      [data.name, data.email, passwordHash]
    );

    const user = result.rows[0];
    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.name === 'ZodError') return next(new ApiError(400, 'Invalid input', err.issues));
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await pool.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
      [data.email]
    );
    const user = result.rows[0];
    if (!user) throw new ApiError(401, 'Invalid email or password');

    const valid = await bcrypt.compare(data.password, user.password_hash);
    if (!valid) throw new ApiError(401, 'Invalid email or password');

    delete user.password_hash;
    const token = signToken(user);
    res.json({ user, token });
  } catch (err) {
    if (err.name === 'ZodError') return next(new ApiError(400, 'Invalid input', err.issues));
    return next(err);
  }
}

module.exports = { register, login };
