// Floating Scenarios panel rendered over the 3D scene while the demo is
// idle. Stop / completion of a scenario flips DemoController back to
// 'idle' and this overlay re-appears automatically.

import type { JSX } from 'react';

import { useDemo } from '../research/DemoController';
import { ScenariosCard } from '../research/ScenariosCard';

export function ScenariosOverlay(): JSX.Element {
  const demo = useDemo();
  return (
    <section className="pointer-events-auto absolute right-12 top-1/2 z-30 w-[380px] max-w-[92vw] -translate-y-1/2">
      <ScenariosCard
        onPlay={(scenario, result) => {
          demo.start(scenario, result);
        }}
      />
    </section>
  );
}
