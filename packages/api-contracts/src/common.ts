// Domain primitives shared across the 5 external APIs.
// Kept hand-written (not generated) because they appear in every spec
// and need stable cross-cutting types.

/**
 * Hierarchical Plot identifier — `farm.site.room.rack.bed.idx`.
 * Examples: `pilot.syd.a.r01.t02.p03` (4-cell plot #3 in bed 2 of rack 1).
 *
 * Plots are the subscription unit and the first-class entity for
 * cross-system data joins (Console crops ↔ Robot scans ↔ Growth photos ↔
 * Subscription assignments).
 */
export type PlotId = string;

/** ISO 8601 UTC timestamp (e.g. `2026-05-28T03:42:00Z`). */
export type IsoTimestamp = string;

/** Sensor type enum — kept stable across versions. */
export type SensorType =
  | 'temperature'
  | 'humidity'
  | 'co2'
  | 'ec'
  | 'ph'
  | 'flow'
  | 'water-level'
  | 'ppfd';

/** Equipment type enum. */
export type EquipmentType =
  | 'pump'
  | 'dosing-pump'
  | 'valve'
  | 'led-bar'
  | 'mist-nozzle'
  | 'co2-cylinder'
  | 'humidifier'
  | 'hvac-diffuser';

/** Severity enum used by alarms and anomalies. */
export type Severity = 'info' | 'warning' | 'critical';

/** Common envelope for paginated collection responses. */
export interface Page<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
  readonly total: number;
}

/** Standard error response body (RFC 7807-ish). */
export interface ApiError {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
}
