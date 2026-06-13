import { useEffect, useState, type JSX } from 'react';

import {
  allPlotIds,
  api,
  type CropId,
  type Experiment,
  type FactorName,
  type Treatment,
} from './api';
import { useCrops } from './useExperiments';

interface FactorDraft {
  readonly name: FactorName;
  readonly unit: string;
  readonly levels: string; // comma-separated, parsed on save
}

interface Props {
  readonly experiment: Experiment | null;
  readonly onCreated: (id: string) => void;
  readonly onUpdated: () => Promise<void>;
}

const FACTOR_NAMES: readonly { name: FactorName; unit: string }[] = [
  { name: 'PPFD', unit: 'µmol/m²/s' },
  { name: 'photoperiodH', unit: 'h/day' },
  { name: 'EC', unit: 'mS/cm' },
  { name: 'pH', unit: '' },
  { name: 'recipeRatio', unit: '0..1' },
  { name: 'T_air', unit: '°C' },
  { name: 'RH', unit: '%' },
  { name: 'CO2', unit: 'ppm' },
  { name: 'airflow', unit: 'm/s' },
];

export function ExperimentDesigner({ experiment, onCreated, onUpdated }: Props): JSX.Element {
  const { crops } = useCrops();
  const [name, setName] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [factors, setFactors] = useState<FactorDraft[]>([
    { name: 'PPFD', unit: 'µmol/m²/s', levels: '200, 400' },
  ]);
  const [crop, setCrop] = useState<CropId>('butter-lettuce');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (experiment) {
      setName(experiment.name);
      setHypothesis(experiment.hypothesis);
      if (experiment.factors.length > 0) {
        setFactors(
          experiment.factors.map((f) => ({
            name: f.name,
            unit: f.unit,
            levels: f.levels.join(', '),
          })),
        );
      }
    } else {
      setName('');
      setHypothesis('');
    }
  }, [experiment?.id]);

  const onCreate = async (): Promise<void> => {
    setError(null);
    try {
      const created = await api.createExperiment({ name, hypothesis });
      onCreated(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const onApplyFactors = async (): Promise<void> => {
    if (!experiment) return;
    setError(null);
    try {
      const parsed = factors.map((f) => ({
        name: f.name,
        unit: f.unit || nameToUnit(f.name),
        levels: f.levels
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n)),
      }));
      const updated = await api.setFactors(experiment.id, parsed);
      if (updated.assignments.length === 0) {
        // Auto-assign: one plot per treatment-replicate, walking the 24-plot list.
        const allPlots = allPlotIds();
        interface AssignmentInput {
          plotId: string;
          treatmentId: string;
          cropId: CropId;
          replicateIndex: number;
        }
        const assignments: AssignmentInput[] = [];
        const reps = Math.max(1, Math.floor(allPlots.length / updated.treatments.length));
        let plotIdx = 0;
        for (const t of updated.treatments) {
          for (let r = 0; r < reps; r++) {
            const plotId = allPlots[plotIdx++];
            if (!plotId) break;
            assignments.push({
              plotId,
              treatmentId: t.id,
              cropId: crop,
              replicateIndex: r + 1,
            });
          }
          if (plotIdx >= allPlots.length) break;
        }
        if (assignments.length > 0) {
          await api.setAssignments(experiment.id, assignments);
        }
      }
      await onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const onStart = async (): Promise<void> => {
    if (!experiment) return;
    setError(null);
    try {
      await api.startExperiment(experiment.id);
      await onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const onComplete = async (): Promise<void> => {
    if (!experiment) return;
    setError(null);
    try {
      await api.completeExperiment(experiment.id);
      await onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section className="rounded-2xl bg-[var(--color-surface-raised)]/85 px-6 py-5 ring-1 ring-white/5 shadow-2xl backdrop-blur-md">
      <h2 className="mb-4 text-lg font-semibold uppercase tracking-[0.18em] text-[var(--color-text)]">
        {experiment ? 'Edit Experiment' : 'New Experiment'}
      </h2>

      <label className="mb-3 block text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
        Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!!experiment && experiment.status !== 'draft'}
          className="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-[var(--color-text)] ring-1 ring-white/10"
        />
      </label>

      <label className="mb-3 block text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
        Hypothesis
        <textarea
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
          disabled={!!experiment && experiment.status !== 'draft'}
          rows={2}
          className="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-[var(--color-text)] ring-1 ring-white/10"
        />
      </label>

      {!experiment ? (
        <button
          type="button"
          onClick={() => void onCreate()}
          disabled={name.length === 0}
          className="rounded-xl bg-[var(--color-success-500)] px-4 py-2 font-semibold text-[#0a1410] disabled:opacity-40"
        >
          Create draft
        </button>
      ) : (
        <>
          <h3 className="mb-2 mt-4 text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Factors (auto-generates full-factorial treatments)
          </h3>
          <div className="space-y-2">
            {factors.map((f, i) => (
              <div key={i} className="flex gap-2">
                <select
                  value={f.name}
                  onChange={(e) => {
                    const next = [...factors];
                    const sel = FACTOR_NAMES.find((x) => x.name === e.target.value);
                    next[i] = {
                      ...f,
                      name: e.target.value as FactorName,
                      unit: sel?.unit ?? f.unit,
                    };
                    setFactors(next);
                  }}
                  disabled={experiment.status !== 'draft'}
                  className="rounded-lg bg-white/5 px-2 py-1 text-sm ring-1 ring-white/10"
                >
                  {FACTOR_NAMES.map((n) => (
                    <option key={n.name} value={n.name}>
                      {n.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={f.levels}
                  onChange={(e) => {
                    const next = [...factors];
                    next[i] = { ...f, levels: e.target.value };
                    setFactors(next);
                  }}
                  disabled={experiment.status !== 'draft'}
                  placeholder="comma-separated levels"
                  className="flex-1 rounded-lg bg-white/5 px-2 py-1 text-sm ring-1 ring-white/10"
                />
                <span className="self-center text-xs text-[var(--color-text-muted)]">{f.unit}</span>
                {experiment.status === 'draft' ? (
                  <button
                    type="button"
                    onClick={() => setFactors(factors.filter((_, j) => j !== i))}
                    className="px-2 text-sm text-red-400"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {experiment.status === 'draft' ? (
            <button
              type="button"
              onClick={() =>
                setFactors([...factors, { name: 'EC', unit: 'mS/cm', levels: '1.5, 2.0' }])
              }
              className="mt-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              + Add factor
            </button>
          ) : null}

          <div className="mt-4">
            <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
              Crop (applied to all assigned plots)
              <select
                value={crop}
                onChange={(e) => setCrop(e.target.value as CropId)}
                disabled={experiment.status !== 'draft'}
                className="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10"
              >
                {crops.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.commonName} ({c.latinName})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {experiment.treatments.length > 0 ? (
            <div className="mt-4">
              <h4 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                Generated treatments ({experiment.treatments.length})
              </h4>
              <ul className="mt-1 text-xs text-[var(--color-text)]">
                {experiment.treatments.map((t: Treatment) => (
                  <li key={t.id} className="border-l-2 border-white/10 pl-2">
                    {t.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 flex gap-2">
            {experiment.status === 'draft' ? (
              <>
                <button
                  type="button"
                  onClick={() => void onApplyFactors()}
                  className="rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/10"
                >
                  Apply factors + auto-assign
                </button>
                <button
                  type="button"
                  onClick={() => void onStart()}
                  className="rounded-xl bg-[var(--color-success-500)] px-3 py-2 text-sm font-semibold text-[#0a1410]"
                  disabled={experiment.assignments.length === 0}
                >
                  ▶ Start
                </button>
              </>
            ) : experiment.status === 'running' ? (
              <button
                type="button"
                onClick={() => void onComplete()}
                className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-[#0a1410]"
              >
                ■ Complete
              </button>
            ) : null}
          </div>
        </>
      )}

      {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}
    </section>
  );
}

function nameToUnit(name: FactorName): string {
  return FACTOR_NAMES.find((n) => n.name === name)?.unit ?? '';
}
