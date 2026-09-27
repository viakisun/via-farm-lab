// Process-wide DeviceSource, chosen by config. Everything reads telemetry and
// sends commands through getDeviceSource() — never the sim singletons directly.
import { loadConfig } from '../config';
import { BackendDeviceSource } from './backend-source';
import { SimDeviceSource } from './sim-source';
import type { DeviceSource } from './source';

let instance: DeviceSource | null = null;

export function getDeviceSource(): DeviceSource {
  instance ??= loadConfig().DEVICE_SOURCE === 'backend' ? new BackendDeviceSource() : new SimDeviceSource();
  return instance;
}

export function resetDeviceSourceForTests(): void {
  instance = null;
}

export * from './source';
