// React hooks over the shared BffClient. All live state arrives on the one
// WebSocket; mutations go out over REST.
import { useCallback, useEffect, useState } from 'react';

import { bff } from './client';
import type {
  CommandInput,
  Rig,
  ScheduleInput,
  ScheduleJob,
  SensorReading,
  SettingsEntry,
} from './types';

/** Subscribe to one stream message type. */
export function useStream<T>(type: string): T | null {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => bff.subscribe(type, (p) => setValue(p as T)), [type]);
  return value;
}

export function useConnected(): boolean {
  const [c, setC] = useState(false);
  useEffect(() => bff.onConnection(setC), []);
  return c;
}

export function useCommissioning(): {
  rigs: Rig[];
  connected: boolean;
  command: (rigId: string, input: CommandInput) => Promise<void>;
  reset: (rigId: string) => Promise<void>;
} {
  const rigs = useStream<Rig[]>('commissioning') ?? [];
  const connected = useConnected();
  const command = useCallback(async (rigId: string, input: CommandInput) => {
    await bff.post(`/commissioning/${rigId}/command`, input);
  }, []);
  const reset = useCallback(async (rigId: string) => {
    await bff.post(`/commissioning/${rigId}/reset`);
  }, []);
  return { rigs, connected, command, reset };
}

export function useSettings(): {
  settings: SettingsEntry[];
  put: (scope: string, patch: Record<string, number>) => Promise<void>;
} {
  const settings = useStream<SettingsEntry[]>('settings') ?? [];
  const put = useCallback(async (scope: string, patch: Record<string, number>) => {
    await bff.put(`/settings/${scope}`, patch);
  }, []);
  return { settings, put };
}

export function useSchedules(): {
  jobs: ScheduleJob[];
  create: (input: ScheduleInput) => Promise<void>;
  toggle: (id: string, enabled: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
  run: (id: string) => Promise<void>;
} {
  const jobs = useStream<ScheduleJob[]>('schedules') ?? [];
  const create = useCallback(async (input: ScheduleInput) => {
    await bff.post('/schedules', input);
  }, []);
  const toggle = useCallback(async (id: string, enabled: boolean) => {
    await bff.put(`/schedules/${id}`, { enabled });
  }, []);
  const remove = useCallback(async (id: string) => {
    await bff.del(`/schedules/${id}`);
  }, []);
  const run = useCallback(async (id: string) => {
    await bff.post(`/schedules/${id}/run`);
  }, []);
  return { jobs, create, toggle, remove, run };
}

export function useSensors(): SensorReading[] {
  return useStream<SensorReading[]>('sensors') ?? [];
}
