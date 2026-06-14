// Time-control surface for the simulator clock.
//
// REST:
//   GET  /sim/clock              → current state
//   POST /sim/clock/start
//   POST /sim/clock/pause
//   POST /sim/clock/seek         { targetMs }
//   POST /sim/clock/speed        { multiplier }
//
// WebSocket:
//   GET  /sim/stream             → JSON message per tick + status changes
//
// Clients subscribe by upgrading to WS; no per-message subscribe protocol
// because the clock stream is single-topic. Heartbeats every 30 s.
import type { ClockStatus, TickEvent } from '@via-farm-lab/sim-core';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { WebSocket } from 'ws';
import { z } from 'zod';

import { hourOfDay, lightIntensityFactor } from '@via-farm-lab/sim-models';

import { getSimClock } from '../sim/clock-singleton';
import { commissioningSnapshot, tickCommissioning } from '../sim/commissioning-singleton';
import { hydrateRunningExperiments, poolStateFor, tickExperiments } from '../sim/experiment-runner';
import { getMultiFactorModel } from '../sim/multi-factor-singleton';
import { getBiomassModel } from '../sim/plants-singleton';

/** How often (in ticks) to broadcast a full biomass snapshot.
 *  At the 60 Hz tick cadence this caps plant updates at ~10 Hz, which is
 *  more than enough for a smooth grow-cycle visual and well below what
 *  React + WebSocket can comfortably push. */
const BIOMASS_BROADCAST_EVERY_TICKS = 6;

/** How often (in ticks) to forward the lightweight tick event to clients.
 *  The clock can fire at up to 60 Hz; pushing every fire saturates React.
 *  Coalescing to ~10 Hz keeps the timeline / scrubber smooth without
 *  flooding the wire. */
const TICK_BROADCAST_EVERY_TICKS = 6;

interface PlantSnapshot {
  readonly plotId: string;
  readonly biomass: number;
  readonly ageDays: number;
  readonly fraction: number;
}

const SeekBody = z.object({
  targetMs: z.number().int().nonnegative(),
});

const SpeedBody = z.object({
  multiplier: z.number().positive().finite(),
});

interface ClockState {
  readonly status: ClockStatus;
  readonly tick: number;
  readonly simTimeMs: number;
  readonly simTimeIso: string;
  readonly speed: number;
}

interface StreamMessage {
  readonly type:
    | 'tick'
    | 'status'
    | 'jumped'
    | 'speed'
    | 'heartbeat'
    | 'plants'
    | 'multi-metric'
    | 'commissioning';
  readonly at: string;
  readonly payload: unknown;
}

interface MultiMetricSnapshot {
  readonly plotId: string;
  readonly cropId: string | undefined;
  readonly ageDays: number;
  readonly biomass: number;
  readonly canopyHeightCm: number;
  readonly leafAreaCm2: number;
  readonly leafCount: number;
  readonly colorHealth: number;
  readonly effectiveR: number;
  /** Current nutrient pool EC (mS/cm). Undefined if the plot has no pool. */
  readonly poolEC?: number;
  /** Current nutrient pool pH (dimensionless). */
  readonly poolPH?: number;
}

function snapshotMultiMetrics(nowMs: number): MultiMetricSnapshot[] {
  const model = getMultiFactorModel();
  const out: MultiMetricSnapshot[] = [];
  for (const [plotId, s] of model.snapshotAll(nowMs)) {
    if (!s) continue;
    const pool = poolStateFor(plotId);
    out.push({
      plotId,
      cropId: model.cropOf(plotId),
      ageDays: s.ageDays,
      biomass: s.biomass,
      canopyHeightCm: s.canopyHeightCm,
      leafAreaCm2: s.leafAreaCm2,
      leafCount: s.leafCount,
      colorHealth: s.colorHealth,
      effectiveR: s.effectiveR,
      ...(pool ? { poolEC: pool.EC, poolPH: pool.pH } : {}),
    });
  }
  return out;
}

function snapshotPlants(nowMs: number): PlantSnapshot[] {
  const model = getBiomassModel();
  const out: PlantSnapshot[] = [];
  for (const [plotId, state] of model.snapshotAll(nowMs)) {
    out.push({
      plotId,
      biomass: state.biomass,
      ageDays: state.ageDays,
      // Normalised 0..1 for the renderer; uses the default K (100) so
      // scaling is consistent across plots without per-plot K lookup.
      fraction: Math.min(1, state.biomass / 100),
    });
  }
  return out;
}

function snapshotClock(): ClockState & {
  readonly hourOfDay: number;
  readonly lightFactor: number;
  readonly simDay: number;
} {
  const clock = getSimClock();
  const simTimeMs = clock.getSimTimeMs();
  return {
    status: clock.getStatus(),
    tick: clock.getTick(),
    simTimeMs,
    simTimeIso: new Date(simTimeMs).toISOString(),
    speed: clock.getSpeed(),
    hourOfDay: hourOfDay(simTimeMs),
    lightFactor: lightIntensityFactor(simTimeMs),
    simDay: Math.floor(simTimeMs / 86_400_000),
  };
}

export const simRoutes: FastifyPluginAsync = (app: FastifyInstance) => {
  // Re-hydrate running experiments into the multi-factor model on startup.
  hydrateRunningExperiments();

  // ── REST ──────────────────────────────────────────────────────────────
  app.get('/sim/clock', (): ClockState => snapshotClock());

  app.get('/sim/plants', (): PlantSnapshot[] => snapshotPlants(getSimClock().getSimTimeMs()));

  app.get('/sim/multi-metric', (): MultiMetricSnapshot[] =>
    snapshotMultiMetrics(getSimClock().getSimTimeMs()),
  );

  app.post('/sim/clock/start', (): ClockState => {
    getSimClock().start();
    return snapshotClock();
  });

  app.post('/sim/clock/pause', (): ClockState => {
    getSimClock().pause();
    return snapshotClock();
  });

  app.post('/sim/clock/seek', (req, reply) => {
    const parsed = SeekBody.safeParse(req.body);
    if (!parsed.success) {
      void reply.status(400).send({
        type: 'https://errors.viafarm.com.au/bad-request',
        title: 'Invalid seek body',
        status: 400,
        detail: parsed.error.message,
      });
      return;
    }
    getSimClock().seek(parsed.data.targetMs);
    return snapshotClock();
  });

  app.post('/sim/clock/speed', (req, reply) => {
    const parsed = SpeedBody.safeParse(req.body);
    if (!parsed.success) {
      void reply.status(400).send({
        type: 'https://errors.viafarm.com.au/bad-request',
        title: 'Invalid speed body',
        status: 400,
        detail: parsed.error.message,
      });
      return;
    }
    try {
      getSimClock().setSpeed(parsed.data.multiplier);
    } catch (err) {
      void reply.status(400).send({
        type: 'https://errors.viafarm.com.au/bad-request',
        title: 'Invalid speed value',
        status: 400,
        detail: err instanceof Error ? err.message : String(err),
      });
      return;
    }
    return snapshotClock();
  });

  // ── WebSocket ─────────────────────────────────────────────────────────
  app.get('/sim/stream', { websocket: true }, (socket: WebSocket) => {
    const clock = getSimClock();

    // Send snapshot on connect so the client can render before the first tick.
    const send = (msg: StreamMessage): void => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(msg));
      }
    };

    send({
      type: 'status',
      at: new Date().toISOString(),
      payload: snapshotClock(),
    });
    // Initial biomass snapshot so the client can render plants before the
    // first throttled biomass broadcast arrives.
    send({
      type: 'plants',
      at: new Date().toISOString(),
      payload: snapshotPlants(clock.getSimTimeMs()),
    });
    send({
      type: 'multi-metric',
      at: new Date().toISOString(),
      payload: snapshotMultiMetrics(clock.getSimTimeMs()),
    });
    send({
      type: 'commissioning',
      at: new Date().toISOString(),
      payload: commissioningSnapshot(clock.getSimTimeMs()),
    });

    const onTick = (e: TickEvent): void => {
      // Always advance the models — keeps biomass, pools & commissioning rigs
      // in sync with sim time even on ticks we choose not to broadcast.
      tickExperiments(e.simTimeMs);
      tickCommissioning(e.simTimeMs);
      const broadcastTick = e.tick % TICK_BROADCAST_EVERY_TICKS === 0;
      const broadcastSnapshot = e.tick % BIOMASS_BROADCAST_EVERY_TICKS === 0;
      if (broadcastTick) {
        send({
          type: 'tick',
          at: new Date(e.wallTimeMs).toISOString(),
          payload: e,
        });
      }
      if (broadcastSnapshot) {
        send({
          type: 'plants',
          at: new Date(e.wallTimeMs).toISOString(),
          payload: snapshotPlants(e.simTimeMs),
        });
        send({
          type: 'multi-metric',
          at: new Date(e.wallTimeMs).toISOString(),
          payload: snapshotMultiMetrics(e.simTimeMs),
        });
        send({
          type: 'commissioning',
          at: new Date(e.wallTimeMs).toISOString(),
          payload: commissioningSnapshot(e.simTimeMs),
        });
      }
    };
    const onStatus = (status: ClockStatus): void => {
      send({
        type: 'status',
        at: new Date().toISOString(),
        payload: { ...snapshotClock(), status },
      });
    };
    const onJumped = (j: { fromMs: number; toMs: number }): void => {
      send({
        type: 'jumped',
        at: new Date().toISOString(),
        payload: j,
      });
    };
    const onSpeed = (speed: number): void => {
      send({
        type: 'speed',
        at: new Date().toISOString(),
        payload: { speed },
      });
    };

    clock.on('tick', onTick);
    clock.on('status', onStatus);
    clock.on('jumped', onJumped);
    clock.on('speed', onSpeed);

    const heartbeat = setInterval(() => {
      send({ type: 'heartbeat', at: new Date().toISOString(), payload: null });
    }, 30_000);

    socket.on('close', () => {
      clearInterval(heartbeat);
      clock.off('tick', onTick);
      clock.off('status', onStatus);
      clock.off('jumped', onJumped);
      clock.off('speed', onSpeed);
    });
  });

  return Promise.resolve();
};
