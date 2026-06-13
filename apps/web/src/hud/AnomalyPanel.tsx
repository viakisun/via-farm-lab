// Bottom-right anomaly feed. Severity colour-coded, newest at top.
// Polls /anomalies — server returns the in-memory ring buffer.

import { useMemo, useState, type JSX } from 'react';

import type { AnomalyEvent, AnomalySeverity } from '../research/api';
import { useDemo } from '../research/DemoController';
import { useAnomalies } from '../research/useExperiments';

const SEVERITY_TONE: Record<AnomalySeverity, { dot: string; ring: string; label: string }> = {
  critical: {
    dot: 'bg-[var(--color-danger-500)]',
    ring: 'ring-[var(--color-danger-500)]/40',
    label: 'critical',
  },
  warning: {
    dot: 'bg-amber-400',
    ring: 'ring-amber-400/40',
    label: 'warning',
  },
  info: {
    dot: 'bg-sky-400',
    ring: 'ring-sky-400/40',
    label: 'info',
  },
};

function shortPlot(plotId: string): string {
  const parts = plotId.split('.');
  return parts.slice(-3).join('.');
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const day = Math.floor(ms / 86_400_000);
  return `Day ${day} ${hh}:${mm}`;
}

export function AnomalyPanel(): JSX.Element | null {
  const demo = useDemo();
  const { anomalies } = useAnomalies(4000);
  const [collapsed, setCollapsed] = useState(false);

  const visible = useMemo<readonly AnomalyEvent[]>(() => {
    const sorted = [...anomalies].sort((a, b) => b.timestampMs - a.timestampMs);
    return sorted.slice(0, 8);
  }, [anomalies]);

  if (demo.status === 'idle' || !demo.scenario) return null;

  const criticalCount = anomalies.filter((a) => a.severity === 'critical').length;

  return (
    <aside
      className={
        'pointer-events-auto absolute bottom-32 right-6 z-30 rounded-2xl bg-[var(--color-surface-raised)]/90 ring-1 ring-white/10 shadow-2xl backdrop-blur-md ' +
        (collapsed ? 'w-[80px]' : 'w-[320px]')
      }
      aria-label="Anomalies"
    >
      <header className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          {collapsed ? 'Anom' : 'Anomalies'}
          {criticalCount > 0 && (
            <span className="rounded-full bg-[var(--color-danger-500)]/30 px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-danger-500)] ring-1 ring-[var(--color-danger-500)]/50">
              {criticalCount}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="rounded bg-white/5 px-2 py-0.5 text-xs text-[var(--color-text-muted)] ring-1 ring-white/10 hover:text-[var(--color-text)]"
        >
          {collapsed ? '◀' : '▶'}
        </button>
      </header>

      {!collapsed && (
        <div className="max-h-[280px] space-y-2 overflow-y-auto px-3 py-3">
          {visible.length === 0 ? (
            <p className="font-mono text-[11px] text-[var(--color-text-muted)]">
              No anomalies detected.
            </p>
          ) : (
            visible.map((a) => {
              const tone = SEVERITY_TONE[a.severity];
              return (
                <article
                  key={`${a.plotId}-${a.timestampMs}-${a.kind}`}
                  className={'rounded-lg bg-white/5 p-2 ring-1 ' + tone.ring}
                >
                  <header className="mb-1 flex items-center gap-2">
                    <span className={'h-2 w-2 rounded-full ' + tone.dot} />
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                      {tone.label} · {a.kind}
                    </span>
                  </header>
                  <p className="text-[11px] leading-snug text-[var(--color-text)]">{a.message}</p>
                  <footer className="mt-1 flex items-center justify-between font-mono text-[10px] text-[var(--color-text-muted)]">
                    <span>{shortPlot(a.plotId)}</span>
                    <span>{formatTime(a.timestampMs)}</span>
                  </footer>
                </article>
              );
            })
          )}
        </div>
      )}
    </aside>
  );
}
