import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
describe('Health API', () => {
  const app = createApp();
  it('GET /api/v1/health returns ok status', async () => {
    const response = await request(app).get('/api/v1/health').expect(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: 'ok',
        app: 'LongevIQ',
      },
    });
    expect(response.body.data.version).toBeTypeOf('string');
    expect(response.body.data.environment).toBeTypeOf('string');
    expect(response.body.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(response.body.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
  it('returns 404 for unknown routes', async () => {
    const response = await request(app).get('/api/v1/does-not-exist').expect(404);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    });
  });
  it('includes security headers', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toBeDefined();
  });
  it('rejects oversized JSON payloads', async () => {
    const hugePayload = { data: 'x'.repeat(3 * 1024 * 1024) };
    const response = await request(app).post('/api/v1/health').send(hugePayload).expect(413);
    expect(response.body).toBeDefined();
  });
});
//# sourceMappingURL=health.spec.js.map
