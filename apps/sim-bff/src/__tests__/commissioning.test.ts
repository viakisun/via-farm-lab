import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { loadConfig } from '../config';
import { buildServer } from '../server';
import { resetSimClockForTests } from '../sim/clock-singleton';
import { resetCommissioningForTests } from '../sim/commissioning-singleton';

interface Verdict {
  metric: 'EC' | 'pH' | 'flow' | 'power';
  signal: 'Pending' | 'Estimated' | 'Measured';
  withinTol: boolean;
}
interface RigSnapshot {
  id: string;
  target: { EC: number; pH: number; abRatio: number } | null;
  inFlight: boolean;
  verdicts: Verdict[];
}

const RIG = 'pilot.syd.a';

describe('commissioning routes', () => {
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
    resetCommissioningForTests();
  });

  afterEach(() => {
    resetCommissioningForTests();
  });

  it('GET /commissioning lists the seeded rig, uncommanded → all Pending', async () => {
    const res = await app.inject({ method: 'GET', url: '/commissioning' });
    expect(res.statusCode).toBe(200);
    const rigs = res.json<RigSnapshot[]>();
    expect(rigs.map((r) => r.id)).toContain(RIG);
    const rig = rigs.find((r) => r.id === RIG);
    expect(rig?.target).toBeNull();
    expect(rig?.verdicts.every((v) => v.signal === 'Pending')).toBe(true);
  });

  it('POST command sets the target and flips EC/pH to Estimated (ramping)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/commissioning/${RIG}/command`,
      payload: { targetEC: 1.8, targetPH: 5.8, abRatio: 1 },
    });
    expect(res.statusCode).toBe(200);
    const rig = res.json<RigSnapshot>();
    expect(rig.target).toEqual({ EC: 1.8, pH: 5.8, abRatio: 1 });
    expect(rig.inFlight).toBe(true);
    expect(rig.verdicts.find((v) => v.metric === 'EC')?.signal).toBe('Estimated');
    // The sensors come online the moment we command.
    expect(rig.verdicts.find((v) => v.metric === 'flow')?.signal).toBe('Measured');
  });

  it('GET /commissioning/:rig returns one rig, 404 for unknown', async () => {
    expect((await app.inject({ method: 'GET', url: `/commissioning/${RIG}` })).statusCode).toBe(
      200,
    );
    expect((await app.inject({ method: 'GET', url: '/commissioning/nope' })).statusCode).toBe(404);
  });

  it('rejects a bad command body (400) and unknown rig (404)', async () => {
    const bad = await app.inject({
      method: 'POST',
      url: `/commissioning/${RIG}/command`,
      payload: { targetEC: -1, targetPH: 6 },
    });
    expect(bad.statusCode).toBe(400);
    const missing = await app.inject({
      method: 'POST',
      url: '/commissioning/nope/command',
      payload: { targetEC: 1.8, targetPH: 5.8 },
    });
    expect(missing.statusCode).toBe(404);
  });

  it('POST reset clears the command back to Pending', async () => {
    await app.inject({
      method: 'POST',
      url: `/commissioning/${RIG}/command`,
      payload: { targetEC: 2.2, targetPH: 5.5 },
    });
    const res = await app.inject({ method: 'POST', url: `/commissioning/${RIG}/reset` });
    expect(res.statusCode).toBe(200);
    const rig = res.json<RigSnapshot>();
    expect(rig.target).toBeNull();
    expect(rig.verdicts.every((v) => v.signal === 'Pending')).toBe(true);
  });
});
