import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../config';
import { buildServer } from '../server';

describe('sim-bff server', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    process.env['PORT'] = '0';
    const config = loadConfig();
    app = await buildServer({ config });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / responds with service identity', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ service: 'via-farm-lab/sim-bff', status: 'ok' });
  });

  it('GET /health is alive', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('GET /ready returns ready', async () => {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ready' });
  });

  it('GET /metrics returns Prometheus text', async () => {
    // Hit a route first so we have a sample metric.
    await app.inject({ method: 'GET', url: '/health' });
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('sim_bff_http_requests_total');
  });
});
