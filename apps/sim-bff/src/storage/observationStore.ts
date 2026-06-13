// In-memory observation store with JSON-file persistence.
//
// Observations are append-only and indexed by plotId for fast time-series
// retrieval. A per-plot ring buffer caps memory growth — the cap is high
// enough for ~6 months of 5-minute sim samples per plot. For longer
// retention, Phase G migrates to a time-series Postgres table.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { MetricName, Observation, ObservationSource } from '../domain/observation';

const DEFAULT_PATH = 'apps/sim-bff/.data/observations.json';
const RING_CAP_PER_PLOT = 100_000;

interface Snapshot {
  readonly version: 1;
  readonly observations: Observation[];
}

export interface ObservationQuery {
  plotId?: string;
  metric?: MetricName;
  source?: ObservationSource;
  fromMs?: number;
  toMs?: number;
  limit?: number;
}

export class ObservationStore {
  private readonly byPlot = new Map<string, Observation[]>();
  private dirty = false;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(private readonly path: string = DEFAULT_PATH) {
    this.load();
    this.saveTimer = setInterval(() => this.flush(), 5000);
    this.saveTimer.unref?.();
  }

  append(obs: Observation): void {
    const list = this.byPlot.get(obs.plotId) ?? [];
    list.push(obs);
    if (list.length > RING_CAP_PER_PLOT) {
      list.splice(0, list.length - RING_CAP_PER_PLOT);
    }
    this.byPlot.set(obs.plotId, list);
    this.dirty = true;
  }

  appendMany(observations: readonly Observation[]): void {
    for (const o of observations) this.append(o);
  }

  query(q: ObservationQuery = {}): readonly Observation[] {
    const source =
      q.plotId !== undefined ? (this.byPlot.get(q.plotId) ?? []) : [...this.byPlot.values()].flat();
    const out: Observation[] = [];
    for (const o of source) {
      if (q.metric && o.metric !== q.metric) continue;
      if (q.source && o.source !== q.source) continue;
      if (q.fromMs !== undefined && o.timestampMs < q.fromMs) continue;
      if (q.toMs !== undefined && o.timestampMs > q.toMs) continue;
      out.push(o);
      if (q.limit !== undefined && out.length >= q.limit) break;
    }
    return out;
  }

  flush(): void {
    if (!this.dirty) return;
    const all: Observation[] = [];
    for (const list of this.byPlot.values()) all.push(...list);
    const snap: Snapshot = { version: 1, observations: all };
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(snap), 'utf8');
    this.dirty = false;
  }

  private load(): void {
    if (!existsSync(this.path)) return;
    try {
      const raw = readFileSync(this.path, 'utf8');
      const snap = JSON.parse(raw) as Snapshot;
      if (snap.version !== 1) return;
      for (const o of snap.observations) {
        const list = this.byPlot.get(o.plotId) ?? [];
        list.push(o);
        this.byPlot.set(o.plotId, list);
      }
    } catch {
      // Corrupted / unreadable file: start fresh.
    }
  }

  /** Test helper. */
  reset(): void {
    this.byPlot.clear();
    this.dirty = false;
  }

  dispose(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
    this.flush();
  }
}

let instance: ObservationStore | null = null;

export function getObservationStore(): ObservationStore {
  instance ??= new ObservationStore();
  return instance;
}

export function resetObservationStoreForTests(): void {
  instance?.reset();
  instance = null;
}
