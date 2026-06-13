import { useCallback, useEffect, useMemo, useState, type JSX } from 'react';

import { BabylonCanvas, type DemoVisualState } from './babylon/Canvas';
import { AnomalyPanel } from './hud/AnomalyPanel';
import { EnvTimeSeriesPanel } from './hud/EnvTimeSeriesPanel';
import { ScenarioBanner } from './hud/ScenarioBanner';
import { ScenarioResultCard } from './hud/ScenarioResultCard';
import { ScenariosOverlay } from './hud/ScenariosOverlay';
import { StatusPill } from './hud/StatusPill';
import { TimelinePanel } from './hud/TimelinePanel';
import { DemoProvider, useDemo } from './research/DemoController';
import { useExperiment, useMultiMetricPoll, useNutrientTanks } from './research/useExperiments';
import { usePlants } from './sim/usePlants';
import { useSimStream } from './sim/useSimStream';

export function App(): JSX.Element {
  const { snapshot, connected } = useSimStream();
  const plants = usePlants();
  const [backend, setBackend] = useState<'webgpu' | 'webgl2' | null>(null);
  const [hudHidden, setHudHidden] = useState(false);

  const plantFractions = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of plants) m.set(p.plotId, p.fraction);
    return m;
  }, [plants]);

  // Demo visuals — drive plant tint / LED material / HVAC indicator from
  // the active scenario's treatments + simulator multi-metrics.
  const demo = useDemo();
  const { experiment } = useExperiment(demo.result?.experimentId ?? null);
  const { metrics } = useMultiMetricPoll(1500);
  const { tanks } = useNutrientTanks(2500);

  const tankLevels = useMemo(() => {
    if (!tanks) return undefined;
    return {
      stockA: tanks.capacities.stockA_mL > 0 ? tanks.stockA_mL / tanks.capacities.stockA_mL : 1,
      stockB: tanks.capacities.stockB_mL > 0 ? tanks.stockB_mL / tanks.capacities.stockB_mL : 1,
      pHAcid: tanks.capacities.pHAcid_mL > 0 ? tanks.pHAcid_mL / tanks.capacities.pHAcid_mL : 1,
    };
  }, [tanks]);

  const demoVisuals = useMemo<DemoVisualState | undefined>(() => {
    if (!experiment) return undefined;
    const factorIdByName = new Map<string, string>();
    for (const f of experiment.factors) factorIdByName.set(f.name, f.id);
    const colorHealthByPlot = new Map<string, number>();
    const ppfdByPlot = new Map<string, number>();
    const tByBasin = new Map<string, number>();
    const ecByBasin = new Map<string, number>();

    let poolEcSum = 0;
    let poolEcCount = 0;
    for (const m of metrics) {
      colorHealthByPlot.set(m.plotId, m.colorHealth);
      if (m.poolEC !== undefined) {
        const parts = m.plotId.split('.');
        const rackId = parts[3];
        const bedKey = parts[4];
        if (rackId && bedKey) {
          const key = `${rackId}.${bedKey}`;
          // Average across plots sharing the same basin (same bed).
          const prev = ecByBasin.get(key);
          ecByBasin.set(key, prev === undefined ? m.poolEC : (prev + m.poolEC) / 2);
        }
        poolEcSum += m.poolEC;
        poolEcCount += 1;
      }
    }

    const tFactorId = factorIdByName.get('T_air');
    const ppfdFactorId = factorIdByName.get('PPFD');
    const ecFactorId = factorIdByName.get('EC');
    type Assignment = (typeof experiment.assignments)[number];
    const assignmentsByTreatment = new Map<string, Assignment[]>();
    for (const a of experiment.assignments) {
      const list = assignmentsByTreatment.get(a.treatmentId) ?? [];
      list.push(a);
      assignmentsByTreatment.set(a.treatmentId, list);
    }
    let supplyEcSum = 0;
    let supplyEcCount = 0;
    for (const t of experiment.treatments) {
      const list = assignmentsByTreatment.get(t.id) ?? [];
      const ppfd = ppfdFactorId !== undefined ? t.factorLevels[ppfdFactorId] : undefined;
      const tAir = tFactorId !== undefined ? t.factorLevels[tFactorId] : undefined;
      const ecLvl = ecFactorId !== undefined ? t.factorLevels[ecFactorId] : undefined;
      if (ecLvl !== undefined) {
        supplyEcSum += ecLvl * list.length;
        supplyEcCount += list.length;
      }
      for (const a of list) {
        if (ppfd !== undefined) ppfdByPlot.set(a.plotId, ppfd);
        if (tAir !== undefined) {
          const parts = a.plotId.split('.');
          const rackId = parts[3];
          const bedKey = parts[4];
          if (rackId && bedKey) tByBasin.set(`${rackId}.${bedKey}`, tAir);
        }
      }
    }
    const supplyEC = supplyEcCount > 0 ? supplyEcSum / supplyEcCount : 2.0;
    const returnEC = poolEcCount > 0 ? poolEcSum / poolEcCount : supplyEC;
    return { colorHealthByPlot, ppfdByPlot, tByBasin, ecByBasin, supplyEC, returnEC };
  }, [experiment, metrics]);

  // CRITICAL: memoise so Canvas's useEffect doesn't see a new function on
  // every parent re-render (each WS message). Without this, Babylon
  // rebuilds the entire scene every ~3 ticks → camera resets, flicker.
  const onReady = useCallback((info: { backend: 'webgpu' | 'webgl2' }) => {
    setBackend(info.backend);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Tab') {
        event.preventDefault();
        setHudHidden((h) => !h);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-(--color-bg) text-(--color-text)">
      <BabylonCanvas
        onReady={onReady}
        plantFractions={plantFractions}
        {...(demoVisuals ? { demoVisuals } : {})}
        {...(snapshot?.simTimeMs !== undefined ? { simTimeMs: snapshot.simTimeMs } : {})}
        {...(tankLevels ? { nutrientTanks: tankLevels } : {})}
        scenarioId={
          (demo.scenario?.id as
            | 'ec-ph'
            | 'led-ppfd'
            | 'cool-warm-co2'
            | 'crop-compare'
            | undefined) ?? null
        }
        focusActive={demo.status === 'playing' || demo.status === 'completing'}
      />
      {!hudHidden && (
        <>
          <StatusPill connected={connected} backend={backend} />
          {demo.status === 'idle' && <ScenariosOverlay />}
          <ScenarioBanner />
          <TimelinePanel />
          <EnvTimeSeriesPanel />
          <AnomalyPanel />
          <ScenarioResultCard />
        </>
      )}
    </main>
  );
}

export default function AppShell(): JSX.Element {
  return (
    <DemoProvider>
      <App />
    </DemoProvider>
  );
}
