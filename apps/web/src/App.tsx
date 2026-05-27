import { Button, Card } from '@via-farm-lab/ui';
import { useState, type JSX } from 'react';

import { BabylonCanvas } from './babylon/Canvas';
import { simControls } from './sim/controls';
import { useSimStream } from './sim/useSimStream';

export function App(): JSX.Element {
  const { snapshot, connected } = useSimStream();
  const [backend, setBackend] = useState<'webgpu' | 'webgl2' | null>(null);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <BabylonCanvas onReady={(info) => setBackend(info.backend)} />

      {/* HUD — clock + connection state */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-sm">
        <Card className="pointer-events-auto bg-[var(--color-surface-raised)]/85 backdrop-blur">
          <header className="mb-3">
            <h1 className="text-lg font-semibold tracking-tight">VIAFARM Digital Twin</h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              {backend ? `Renderer: ${backend.toUpperCase()}` : 'Initialising renderer…'}
              {' · '}
              <span
                className={
                  connected ? 'text-[var(--color-success-500)]' : 'text-[var(--color-warning-500)]'
                }
              >
                {connected ? 'BFF connected' : 'BFF connecting…'}
              </span>
            </p>
          </header>

          <dl className="grid grid-cols-[7rem_1fr] gap-y-1 text-sm">
            <dt className="text-[var(--color-text-muted)]">Status</dt>
            <dd className="font-mono">{snapshot?.status ?? '—'}</dd>
            <dt className="text-[var(--color-text-muted)]">Tick</dt>
            <dd className="font-mono">{snapshot?.tick.toLocaleString('en-AU') ?? '—'}</dd>
            <dt className="text-[var(--color-text-muted)]">Sim time</dt>
            <dd className="font-mono">
              {snapshot
                ? new Date(snapshot.simTimeMs).toLocaleString('en-AU', {
                    timeZone: 'Australia/Sydney',
                    hour12: false,
                  })
                : '—'}
            </dd>
            <dt className="text-[var(--color-text-muted)]">Speed</dt>
            <dd className="font-mono">{snapshot ? `${snapshot.speed}×` : '—'}</dd>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => void simControls.start()}>
              Start
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void simControls.pause()}>
              Pause
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void simControls.setSpeed(1)}>
              1×
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void simControls.setSpeed(10)}>
              10×
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void simControls.setSpeed(100)}>
              100×
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
