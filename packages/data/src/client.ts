// One BFF client per app: a single shared WebSocket to /sim/stream (dispatched
// by message `type`) plus typed REST helpers. Replaces the per-hook sockets in
// the older apps. Lazily connects on first subscribe; auto-reconnects.
import { bffHttpUrl, bffWsUrl } from './bff-url';

type Listener = (payload: unknown) => void;
type ConnListener = (connected: boolean) => void;

class BffClient {
  private ws: WebSocket | null = null;
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly connListeners = new Set<ConnListener>();
  /** Last payload seen per type, so a late subscriber renders immediately. */
  private readonly cache = new Map<string, unknown>();
  private connected = false;
  private attempt = 0;
  private backoff: ReturnType<typeof setTimeout> | null = null;

  /** Subscribe to a stream message type. Returns an unsubscribe fn. */
  subscribe(type: string, fn: Listener): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(fn);
    this.ensureSocket();
    if (this.cache.has(type)) fn(this.cache.get(type));
    return () => {
      set.delete(fn);
    };
  }

  onConnection(fn: ConnListener): () => void {
    this.connListeners.add(fn);
    this.ensureSocket();
    fn(this.connected);
    return () => {
      this.connListeners.delete(fn);
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(bffHttpUrl(path));
    return (await res.json()) as T;
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.send<T>('POST', path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.send<T>('PUT', path, body);
  }

  async del<T>(path: string): Promise<T> {
    return this.send<T>('DELETE', path);
  }

  private async send<T>(method: string, path: string, body?: unknown): Promise<T> {
    const init: RequestInit = { method };
    if (body !== undefined) {
      init.headers = { 'content-type': 'application/json' };
      init.body = JSON.stringify(body);
    }
    const res = await fetch(bffHttpUrl(path), init);
    return (await res.json()) as T;
  }

  private ensureSocket(): void {
    if (this.ws || typeof window === 'undefined') return;
    const ws = new WebSocket(bffWsUrl('/sim/stream'));
    this.ws = ws;
    ws.addEventListener('open', () => {
      this.attempt = 0;
      this.setConnected(true);
    });
    ws.addEventListener('message', (e: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(e.data) as { type: string; payload: unknown };
        this.cache.set(msg.type, msg.payload);
        const set = this.listeners.get(msg.type);
        if (set) for (const fn of set) fn(msg.payload);
      } catch {
        // ignore malformed frames
      }
    });
    ws.addEventListener('close', () => {
      this.setConnected(false);
      this.ws = null;
      this.attempt = Math.min(this.attempt + 1, 6);
      this.backoff = setTimeout(() => this.ensureSocket(), Math.min(30_000, 500 * 2 ** this.attempt));
    });
    ws.addEventListener('error', () => ws.close());
  }

  private setConnected(c: boolean): void {
    this.connected = c;
    for (const fn of this.connListeners) fn(c);
  }

  /** Test helper. */
  _reset(): void {
    if (this.backoff) clearTimeout(this.backoff);
    this.ws?.close();
    this.ws = null;
    this.listeners.clear();
    this.connListeners.clear();
    this.cache.clear();
    this.connected = false;
    this.attempt = 0;
  }
}

export const bff = new BffClient();
