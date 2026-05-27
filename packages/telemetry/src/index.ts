// Public API barrel — re-exports the most commonly used entry points.
// Prefer subpath imports for tree-shaking:
//   import { initBrowserTelemetry } from '@via-farm-lab/telemetry/browser';
//   import { createLogger } from '@via-farm-lab/telemetry/logger';
//   import { reportWebVitals } from '@via-farm-lab/telemetry/web-vitals';
export { isTelemetryEnabled, resolveTelemetryConfig, type TelemetryConfig } from './config';
