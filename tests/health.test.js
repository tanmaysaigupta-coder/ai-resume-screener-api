const request = require('supertest');
const { createApp } = require('../src/app');

describe('GET /health', () => {
  it('returns 200 with service status', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'ai-resume-screener-api' });
  });
});

describe('unknown route', () => {
  it('returns 404 in the standard error shape', async () => {
    const app = createApp();
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
