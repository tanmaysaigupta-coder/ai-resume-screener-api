jest.mock('../src/config/db', () => ({
  pool: { query: jest.fn() },
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const { pool } = require('../src/config/db');

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  it('creates a new user and returns a token', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // existing-email check
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Tanmay', email: 'tanmay@example.com', role: 'recruiter', created_at: new Date() }],
      });

    const app = createApp();
    const res = await request(app).post('/api/auth/register').send({
      name: 'Tanmay',
      email: 'tanmay@example.com',
      password: 'supersecret123',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('tanmay@example.com');
  });

  it('rejects a duplicate email with 409', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const app = createApp();
    const res = await request(app).post('/api/auth/register').send({
      name: 'Tanmay',
      email: 'tanmay@example.com',
      password: 'supersecret123',
    });

    expect(res.status).toBe(409);
  });

  it('rejects invalid input with 400', async () => {
    const app = createApp();
    const res = await request(app).post('/api/auth/register').send({
      name: 'T',
      email: 'not-an-email',
      password: '123',
    });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  it('logs in with correct credentials', async () => {
    const passwordHash = await bcrypt.hash('supersecret123', 10);
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'Tanmay',
          email: 'tanmay@example.com',
          password_hash: passwordHash,
          role: 'recruiter',
        },
      ],
    });

    const app = createApp();
    const res = await request(app).post('/api/auth/login').send({
      email: 'tanmay@example.com',
      password: 'supersecret123',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('rejects wrong password with 401', async () => {
    const passwordHash = await bcrypt.hash('supersecret123', 10);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'tanmay@example.com', password_hash: passwordHash, role: 'recruiter' }],
    });

    const app = createApp();
    const res = await request(app).post('/api/auth/login').send({
      email: 'tanmay@example.com',
      password: 'wrong-password',
    });

    expect(res.status).toBe(401);
  });
});
