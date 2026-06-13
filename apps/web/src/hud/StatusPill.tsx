import type { JSX } from 'react';

interface Props {
  readonly connected: boolean;
  readonly backend: 'webgpu' | 'webgl2' | null;
}

export function StatusPill({ connected, backend }: Props): JSX.Element {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-30 flex items-center gap-2 rounded-full bg-[var(--color-surface-raised)]/70 px-3 py-1.5 text-[11px] text-[var(--color-text-muted)] ring-1 ring-white/5 backdrop-blur">
      <span
        className={
          'h-1.5 w-1.5 rounded-full ' +
          (connected ? 'bg-emerald-400' : 'animate-pulse bg-amber-400')
        }
      />
      <span>{connected ? 'Connected' : 'Connecting…'}</span>
      <span className="opacity-50">·</span>
      <span className="font-mono uppercase tracking-wider">{backend ?? '—'}</span>
    </div>
  );
}
