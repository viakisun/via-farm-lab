// BackendDeviceSource — future real-device path. When DEVICE_SOURCE=backend it
// will talk to the L1–L2 integration middleware (backend.yaml): GET /sensors,
// WS /stream/sensors, POST /equipment/{id}/command. Stubbed until that lands;
// the seam exists so wiring it later changes nothing downstream.
import type { CommandAck, DeviceSource, EquipmentCommand, SensorMeta, SensorReading } from './source';

const NOT_WIRED = 'BackendDeviceSource not wired yet — set DEVICE_SOURCE=sim';

export class BackendDeviceSource implements DeviceSource {
  readonly kind = 'backend' as const;

  listSensors(): SensorMeta[] {
    throw new Error(NOT_WIRED);
  }
  readLatest(_nowMs: number): SensorReading[] {
    throw new Error(NOT_WIRED);
  }
  command(_equipmentId: string, _cmd: EquipmentCommand, _nowMs: number): CommandAck {
    throw new Error(NOT_WIRED);
  }
}
