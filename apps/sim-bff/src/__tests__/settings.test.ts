import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { loadConfig } from '../config';
import { buildServer } from '../server';
import { resetSimClockForTests } from '../sim/clock-singleton';
import { resetCommissioningForTests } from '../sim/commissioning-singleton';
import { resetSettingsStoreForTests } from '../storage/settingsStore';

interface SettingsEntry {
  scope: string;
  config: { flowRateLmin: number; ecTol: number };
}

const SCOPE = 'nutrient:pilot.syd.a';

describe('settings routes', () => {
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
    resetSettingsStoreForTests();
  });

  afterEach(() => {
    resetCommissioningForTests();
    resetSettingsStoreForTests();
  });

  it('GET /settings lists the rig with default config', async () => {
    const res = await app.inject({ method: 'GET', url: '/settings' });
    expect(res.statusCode).toBe(200);
    const list = res.json<SettingsEntry[]>();
    const nutrient = list.find((e) => e.scope === SCOPE);
    expect(nutrient?.config.flowRateLmin).toBe(1.8); // COMMISSION_PARAMS default
  });

  it('PUT merges + applies a config override (GET reflects it)', async () => {
    const put = await app.inject({ method: 'PUT', url: `/settings/${SCOPE}`, payload: { flowRateLmin: 3.5, ecTol: 0.2 } });
    expect(put.statusCode).toBe(200);
    expect(put.json<SettingsEntry>().config.flowRateLmin).toBe(3.5);
    const get = await app.inject({ method: 'GET', url: `/settings/${SCOPE}` });
    expect(get.json<SettingsEntry>().config.flowRateLmin).toBe(3.5);
    expect(get.json<SettingsEntry>().config.ecTol).toBe(0.2);
  });

  it('a PUT setting then a command uses the new config', async () => {
    await app.inject({ method: 'PUT', url: `/settings/${SCOPE}`, payload: { flowRateLmin: 4.2 } });
    const cmd = await app.inject({
      method: 'POST',
      url: '/commissioning/pilot.syd.a/command',
      payload: { targetEC: 1.8, targetPH: 5.8 },
    });
    expect(cmd.statusCode).toBe(200);
    expect(cmd.json<{ config: { flowRateLmin: number } }>().config.flowRateLmin).toBe(4.2);
  });

  it('rejects unknown scope (404) and bad body (400)', async () => {
    expect((await app.inject({ method: 'GET', url: '/settings/weather:x' })).statusCode).toBe(404);
    expect(
      (await app.inject({ method: 'PUT', url: `/settings/${SCOPE}`, payload: { flowRateLmin: -1 } })).statusCode,
    ).toBe(400);
    expect((await app.inject({ method: 'PUT', url: `/settings/${SCOPE}`, payload: {} })).statusCode).toBe(400);
  });
});
