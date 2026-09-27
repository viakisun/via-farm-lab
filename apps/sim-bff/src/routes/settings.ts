// Settings surface — push/pull the runtime "양액 설정" (rig nutrient config).
// GET returns the effective config (defaults + overrides); PUT merges a partial,
// applies it to the sim, persists it, and broadcasts to stream clients.
// Scope = `nutrient:<rigId>`.
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { configureRig, nutrientSettings, rigConfig } from '../sim/commissioning-singleton';
import { broadcastSettings } from './sim';

const NUTRIENT_PREFIX = 'nutrient:';

// Partial RigConfig — every field optional, each a sane positive number.
const pos = z.number().positive().finite();
const ConfigPatch = z
  .object({
    flowRateLmin: pos,
    pumpPowerW: pos,
    baselinePowerW: pos,
    ecK: pos,
    baseVolumeL: pos,
    tauSec: pos,
    settleHoldSec: pos,
    ecTol: pos,
    phTol: pos,
    defaultAbRatio: pos,
  })
  .partial()
  .strict();

const problem = (status: number, title: string, detail: string) => ({
  type: `https://errors.viafarm.com.au/${status === 404 ? 'not-found' : 'bad-request'}`,
  title,
  status,
  detail,
});

export const settingsRoutes: FastifyPluginAsync = (app) => {
  app.get('/settings', () => nutrientSettings());

  app.get('/settings/:scope', (req, reply) => {
    const { scope } = req.params as { scope: string };
    if (!scope.startsWith(NUTRIENT_PREFIX)) {
      void reply.status(404).send(problem(404, 'Not Found', `unknown scope ${scope}`));
      return;
    }
    const cfg = rigConfig(scope.slice(NUTRIENT_PREFIX.length));
    if (!cfg) {
      void reply.status(404).send(problem(404, 'Not Found', `unknown rig for scope ${scope}`));
      return;
    }
    return { scope, config: cfg };
  });

  app.put('/settings/:scope', (req, reply) => {
    const { scope } = req.params as { scope: string };
    if (!scope.startsWith(NUTRIENT_PREFIX)) {
      void reply.status(404).send(problem(404, 'Not Found', `unknown scope ${scope}`));
      return;
    }
    const parsed = ConfigPatch.safeParse(req.body);
    if (!parsed.success) {
      void reply.status(400).send(problem(400, 'Bad Request', parsed.error.message));
      return;
    }
    const patch: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v !== undefined) patch[k] = v;
    }
    if (Object.keys(patch).length === 0) {
      void reply.status(400).send(problem(400, 'Bad Request', 'no settings provided'));
      return;
    }
    const next = configureRig(scope.slice(NUTRIENT_PREFIX.length), patch);
    if (!next) {
      void reply.status(404).send(problem(404, 'Not Found', `unknown rig for scope ${scope}`));
      return;
    }
    broadcastSettings();
    return { scope, config: next };
  });

  return Promise.resolve();
};
