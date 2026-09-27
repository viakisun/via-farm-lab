// Runtime settings overrides, persisted to JSON. Keyed by scope
// (e.g. `nutrient:pilot.syd.a`) → a flat record of numeric overrides. The
// effective values live on the sim models; this store only records the deltas
// so they survive a restart. Path is anchored to the package (import.meta.url),
// never cwd, so it can't recreate the nested `.data/` blow-up.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export type SettingsRecord = Record<string, number>;

const DEFAULT_PATH = fileURLToPath(new URL('../../.data/settings.json', import.meta.url));

interface Snapshot {
  readonly version: 1;
  readonly scopes: Record<string, SettingsRecord>;
}

export class SettingsStore {
  private readonly scopes = new Map<string, SettingsRecord>();
  private dirty = false;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(private readonly path: string = DEFAULT_PATH) {
    this.load();
    this.saveTimer = setInterval(() => this.flush(), 2000);
    this.saveTimer.unref?.();
  }

  get(scope: string): SettingsRecord | undefined {
    return this.scopes.get(scope);
  }

  list(): { scope: string; value: SettingsRecord }[] {
    return [...this.scopes.entries()].map(([scope, value]) => ({ scope, value }));
  }

  /** Merge a partial override into a scope. */
  put(scope: string, patch: SettingsRecord): SettingsRecord {
    const next = { ...this.scopes.get(scope), ...patch };
    this.scopes.set(scope, next);
    this.dirty = true;
    return next;
  }

  flush(): void {
    if (!this.dirty) return;
    const snap: Snapshot = { version: 1, scopes: Object.fromEntries(this.scopes) };
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(snap, null, 2), 'utf8');
    this.dirty = false;
  }

  private load(): void {
    if (!existsSync(this.path)) return;
    try {
      const snap = JSON.parse(readFileSync(this.path, 'utf8')) as Snapshot;
      if (snap.version !== 1) return;
      for (const [scope, value] of Object.entries(snap.scopes)) this.scopes.set(scope, value);
    } catch {
      // Corrupted / unreadable: start fresh.
    }
  }

  reset(): void {
    this.scopes.clear();
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

let instance: SettingsStore | null = null;

export function getSettingsStore(): SettingsStore {
  instance ??= new SettingsStore();
  return instance;
}

export function resetSettingsStoreForTests(): void {
  instance?.reset();
  instance = null;
}
