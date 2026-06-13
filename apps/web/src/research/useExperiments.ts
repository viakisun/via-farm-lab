// React hooks for the research platform — experiments, observations, multi-metric.
//
// These wrap the api.ts thin client with React state + manual refresh.
// No caching layer (yet); the BFF JSON responses are small.
import { useCallback, useEffect, useState } from 'react';

import {
  type AnomalyEvent,
  type Crop,
  type Experiment,
  type MultiMetricSnapshot,
  type NutrientTankState,
  type Observation,
  api,
} from './api';

export function useExperiments(): {
  experiments: readonly Experiment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [experiments, setExperiments] = useState<readonly Experiment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setExperiments(await api.listExperiments());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { experiments, loading, error, refresh };
}

export function useExperiment(id: string | null): {
  experiment: Experiment | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setExperiment(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setExperiment(await api.getExperiment(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { experiment, loading, error, refresh };
}

export function useCrops(): { crops: readonly Crop[]; loading: boolean } {
  const [crops, setCrops] = useState<readonly Crop[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listCrops()
      .then((c) => {
        if (!cancelled) setCrops(c);
      })
      .catch(() => {
        /* swallow — crops are display-only */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { crops, loading };
}

/**
 * Live multi-metric snapshot — polls /sim/multi-metric every `intervalMs`.
 * Cheap fallback until we tap into the multi-metric WS topic from useSimStream.
 */
export function useMultiMetricPoll(intervalMs = 3000): {
  metrics: readonly MultiMetricSnapshot[];
} {
  const [metrics, setMetrics] = useState<readonly MultiMetricSnapshot[]>([]);
  useEffect(() => {
    let alive = true;
    const tick = async (): Promise<void> => {
      try {
        const m = await api.getMultiMetric();
        if (alive) setMetrics(m);
      } catch {
        /* ignore */
      }
    };
    void tick();
    const h = setInterval(() => void tick(), intervalMs);
    return () => {
      alive = false;
      clearInterval(h);
    };
  }, [intervalMs]);
  return { metrics };
}

export function useNutrientTanks(intervalMs = 2500): {
  tanks: NutrientTankState | null;
} {
  const [tanks, setTanks] = useState<NutrientTankState | null>(null);
  useEffect(() => {
    let alive = true;
    const tick = async (): Promise<void> => {
      try {
        const t = await api.getNutrientTanks();
        if (alive) setTanks(t);
      } catch {
        /* ignore */
      }
    };
    void tick();
    const h = setInterval(() => void tick(), intervalMs);
    return () => {
      alive = false;
      clearInterval(h);
    };
  }, [intervalMs]);
  return { tanks };
}

export function useAnomalies(intervalMs = 2500): {
  anomalies: readonly AnomalyEvent[];
} {
  const [anomalies, setAnomalies] = useState<readonly AnomalyEvent[]>([]);
  useEffect(() => {
    let alive = true;
    const tick = async (): Promise<void> => {
      try {
        const a = await api.listAnomalies({ limit: 50 });
        if (alive) setAnomalies(a);
      } catch {
        /* ignore */
      }
    };
    void tick();
    const h = setInterval(() => void tick(), intervalMs);
    return () => {
      alive = false;
      clearInterval(h);
    };
  }, [intervalMs]);
  return { anomalies };
}

export function useObservations(query: {
  plotId?: string;
  metric?: Observation['metric'];
  limit?: number;
}): { observations: readonly Observation[]; loading: boolean; refresh: () => Promise<void> } {
  const [observations, setObservations] = useState<readonly Observation[]>([]);
  const [loading, setLoading] = useState(false);
  const key = JSON.stringify(query);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Use the explicit key in the dep list — this keeps the callback
      // referentially stable while the query shape is unchanged, even
      // though `query` itself is a new object on every render.
      void key;
      setObservations(await api.queryObservations(query));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [key, query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { observations, loading, refresh };
}
