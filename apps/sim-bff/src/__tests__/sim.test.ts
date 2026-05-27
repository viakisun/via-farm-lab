import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { loadConfig } from '../config';
import { buildServer } from '../server';
import { resetSimClockForTests } from '../sim/clock-singleton';

interface ClockState {
  status: 'stopped' | 'running' | 'paused';
  tick: number;
  simTimeMs: number;
  simTimeIso: string;
  speed: number;
}

describe('sim time-control routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    process.env['PORT'] = '0';
    app = await buildServer({ config: loadConfig() });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    resetSimClockForTests();
  });

  afterEach(() => {
    resetSimClockForTests();
  });

  it('GET /sim/clock returns a snapshot', async () => {
    const res = await app.inject({ method: 'GET', url: '/sim/clock' });
    expect(res.statusCode).toBe(200);
    const body = res.json<ClockState>();
    expect(body.status).toBe('running');
    expect(body.tick).toBeGreaterThanOrEqual(0);
    expect(body.speed).toBe(1);
    expect(body.simTimeIso).toMatch(/T/);
  });

  it('POST /sim/clock/pause then /start round-trips status', async () => {
    const pause = await app.inject({ method: 'POST', url: '/sim/clock/pause' });
    expect(pause.json<ClockState>().status).toBe('paused');
    const start = await app.inject({ method: 'POST', url: '/sim/clock/start' });
    expect(start.json<ClockState>().status).toBe('running');
  });

  it('POST /sim/clock/seek jumps simulated time', async () => {
    const target = 1_900_000_000_000;
    const res = await app.inject({
      method: 'POST',
      url: '/sim/clock/seek',
      payload: { targetMs: target },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<ClockState>().simTimeMs).toBe(target);
  });

  it('POST /sim/clock/seek rejects bad bodies', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/sim/clock/seek',
      payload: { targetMs: -1 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /sim/clock/speed clamps and reports the new value', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/sim/clock/speed',
      payload: { multiplier: 10 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<ClockState>().speed).toBe(10);
  });

  it('POST /sim/clock/speed rejects non-positive values', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/sim/clock/speed',
      payload: { multiplier: 0 },
    });
    expect(res.statusCode).toBe(400);
  });
});
