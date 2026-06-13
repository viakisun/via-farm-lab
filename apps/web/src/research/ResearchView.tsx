import { useState, type JSX } from 'react';

import { useDemo } from './DemoController';
import { ExperimentDashboard } from './ExperimentDashboard';
import { ExperimentDesigner } from './ExperimentDesigner';
import { ExperimentList } from './ExperimentList';
import { ScenariosCard } from './ScenariosCard';
import { useExperiment } from './useExperiments';

export function ResearchView(): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { experiment, refresh } = useExperiment(selectedId);
  const demo = useDemo();

  return (
    <div className="grid h-full grid-cols-12 gap-4 px-4 py-4">
      <aside className="col-span-3 space-y-4">
        <ScenariosCard
          onPlay={(scenario, result) => {
            demo.start(scenario, result);
            setSelectedId(result.experimentId);
            setCreating(false);
          }}
        />
        <ExperimentList
          onSelect={(id) => {
            setSelectedId(id);
            setCreating(false);
          }}
          onNew={() => {
            setSelectedId(null);
            setCreating(true);
          }}
        />
      </aside>
      <main className="col-span-9 space-y-4 overflow-y-auto">
        {creating || experiment?.status === 'draft' ? (
          <ExperimentDesigner
            experiment={experiment}
            onCreated={(id) => {
              setCreating(false);
              setSelectedId(id);
            }}
            onUpdated={() => refresh()}
          />
        ) : null}
        {experiment && experiment.status !== 'draft' ? (
          <ExperimentDashboard experiment={experiment} />
        ) : null}
        {!creating && !experiment ? (
          <div className="rounded-2xl bg-[var(--color-surface-raised)]/60 px-6 py-10 text-center text-sm text-[var(--color-text-muted)] ring-1 ring-white/5">
            Select an experiment on the left or create a new one.
          </div>
        ) : null}
      </main>
    </div>
  );
}
