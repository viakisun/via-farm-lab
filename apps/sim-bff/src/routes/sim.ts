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

import { getSimClock } from '../sim/clock-singleton';

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
  readonly type: 'tick' | 'status' | 'jumped' | 'speed' | 'heartbeat';
  readonly at: string;
  readonly payload: unknown;
}

function snapshotClock(): ClockState {
  const clock = getSimClock();
  const simTimeMs = clock.getSimTimeMs();
  return {
    status: clock.getStatus(),
    tick: clock.getTick(),
    simTimeMs,
    simTimeIso: new Date(simTimeMs).toISOString(),
    speed: clock.getSpeed(),
  };
}

export const simRoutes: FastifyPluginAsync = (app: FastifyInstance) => {
  // ── REST ──────────────────────────────────────────────────────────────
  app.get('/sim/clock', (): ClockState => snapshotClock());

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

    const onTick = (e: TickEvent): void => {
      send({
        type: 'tick',
        at: new Date(e.wallTimeMs).toISOString(),
        payload: e,
      });
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
