// Per-crop biomass + env target trajectories. Used to classify whether a
// plot is on-track / under / over its expected envelope, and to draw the
// "target band" on the growth-curve and env-time-series charts.

import { biomassAt, type BiomassParams } from './biomass';
import type { CropId, CropParams } from './crops';
import type { EnvActual } from './environment';

export type AnomalySeverity = 'info' | 'warning' | 'critical';

export type AnomalyKind =
  | 'co2-deficit'
  | 'co2-excess'
  | 'biomass-under-target'
  | 'biomass-over-target'
  | 'ec-drift'
  | 'ph-drift'
  | 't-cool-stress'
  | 't-heat-stress'
  | 'colour-chlorosis';

export interface AnomalyEvent {
  readonly timestampMs: number;
  readonly plotId: string;
  readonly cropId: CropId;
  readonly kind: AnomalyKind;
  readonly severity: AnomalySeverity;
  readonly actualValue: number;
  readonly expectedRange: { readonly min: number; readonly max: number };
  readonly message: string;
}

/** Expected biomass at age `ageDays` under ideal conditions. */
export function targetBiomass(crop: CropParams, ageDays: number): number {
  const params: BiomassParams = { K: crop.K, r: crop.r_max, B0: crop.B0 };
  return biomassAt(params, ageDays);
}

interface MetricInput {
  /** Days since transplant. */
  readonly ageDays: number;
  /** Current biomass (0..K). */
  readonly biomass: number;
  /** Colour-health 0..1. */
  readonly colorHealth: number;
}

/**
 * Detect anomalies for one plot's current state. Empty array means everything
 * is within bounds. Each detection includes severity + actual vs expected so
 * the UI can show a band overlay and an alert badge.
 */
export function classifyAnomalies(
  plotId: string,
  crop: CropParams,
  metric: MetricInput,
  env: EnvActual,
  nowMs: number,
): AnomalyEvent[] {
  const out: AnomalyEvent[] = [];

  // Biomass vs target trajectory (±15% normal, ±30% warning, >30% critical)
  const target = targetBiomass(crop, metric.ageDays);
  if (metric.ageDays > 1 && target > crop.B0 * 2) {
    const ratio = metric.biomass / target;
    if (ratio < 0.85) {
      const severity: AnomalySeverity = ratio < 0.7 ? 'critical' : 'warning';
      out.push({
        timestampMs: nowMs,
        plotId,
        cropId: crop.id,
        kind: 'biomass-under-target',
        severity,
        actualValue: metric.biomass,
        expectedRange: { min: target * 0.85, max: target * 1.15 },
        message: `Biomass ${((1 - ratio) * 100).toFixed(0)}% under target (${metric.biomass.toFixed(1)} vs ${target.toFixed(1)} g)`,
      });
    } else if (ratio > 1.15) {
      out.push({
        timestampMs: nowMs,
        plotId,
        cropId: crop.id,
        kind: 'biomass-over-target',
        severity: 'info',
        actualValue: metric.biomass,
        expectedRange: { min: target * 0.85, max: target * 1.15 },
        message: `Biomass ${((ratio - 1) * 100).toFixed(0)}% above target`,
      });
    }
  }

  // CO2 deficit / excess against crop optimal range
  const co2Range = crop.optimal.CO2;
  if (env.CO2 < co2Range.min - co2Range.tolerance * 0.5) {
    out.push({
      timestampMs: nowMs,
      plotId,
      cropId: crop.id,
      kind: 'co2-deficit',
      severity: env.CO2 < co2Range.min - co2Range.tolerance ? 'critical' : 'warning',
      actualValue: env.CO2,
      expectedRange: { min: co2Range.min, max: co2Range.max },
      message: `CO₂ ${env.CO2.toFixed(0)} ppm — below ${co2Range.min} ppm target`,
    });
  } else if (env.CO2 > co2Range.max + co2Range.tolerance) {
    out.push({
      timestampMs: nowMs,
      plotId,
      cropId: crop.id,
      kind: 'co2-excess',
      severity: 'warning',
      actualValue: env.CO2,
      expectedRange: { min: co2Range.min, max: co2Range.max },
      message: `CO₂ ${env.CO2.toFixed(0)} ppm — above ${co2Range.max} ppm range`,
    });
  }

  // EC drift
  const ecRange = crop.optimal.EC;
  if (env.EC < ecRange.min - ecRange.tolerance) {
    out.push({
      timestampMs: nowMs,
      plotId,
      cropId: crop.id,
      kind: 'ec-drift',
      severity: 'warning',
      actualValue: env.EC,
      expectedRange: { min: ecRange.min, max: ecRange.max },
      message: `EC ${env.EC.toFixed(2)} mS/cm — below target`,
    });
  } else if (env.EC > ecRange.max + ecRange.tolerance) {
    out.push({
      timestampMs: nowMs,
      plotId,
      cropId: crop.id,
      kind: 'ec-drift',
      severity: 'warning',
      actualValue: env.EC,
      expectedRange: { min: ecRange.min, max: ecRange.max },
      message: `EC ${env.EC.toFixed(2)} mS/cm — above target`,
    });
  }

  // pH drift
  const phRange = crop.optimal.pH;
  if (env.pH < phRange.min - phRange.tolerance || env.pH > phRange.max + phRange.tolerance) {
    out.push({
      timestampMs: nowMs,
      plotId,
      cropId: crop.id,
      kind: 'ph-drift',
      severity: 'warning',
      actualValue: env.pH,
      expectedRange: { min: phRange.min, max: phRange.max },
      message: `pH ${env.pH.toFixed(2)} — outside target`,
    });
  }

  // T_air stress
  const tRange = crop.optimal.T;
  if (env.T_air < tRange.min - tRange.tolerance * 0.5) {
    out.push({
      timestampMs: nowMs,
      plotId,
      cropId: crop.id,
      kind: 't-cool-stress',
      severity: env.T_air < tRange.min - tRange.tolerance ? 'critical' : 'warning',
      actualValue: env.T_air,
      expectedRange: { min: tRange.min, max: tRange.max },
      message: `T ${env.T_air.toFixed(1)}°C — cool stress`,
    });
  } else if (env.T_air > tRange.max + tRange.tolerance * 0.5) {
    out.push({
      timestampMs: nowMs,
      plotId,
      cropId: crop.id,
      kind: 't-heat-stress',
      severity: env.T_air > tRange.max + tRange.tolerance ? 'critical' : 'warning',
      actualValue: env.T_air,
      expectedRange: { min: tRange.min, max: tRange.max },
      message: `T ${env.T_air.toFixed(1)}°C — heat stress`,
    });
  }

  // Colour chlorosis
  if (metric.colorHealth < 0.55) {
    out.push({
      timestampMs: nowMs,
      plotId,
      cropId: crop.id,
      kind: 'colour-chlorosis',
      severity: metric.colorHealth < 0.35 ? 'critical' : 'warning',
      actualValue: metric.colorHealth,
      expectedRange: { min: 0.7, max: 1 },
      message: `Colour health ${(metric.colorHealth * 100).toFixed(0)}% — chlorosis`,
    });
  }

  return out;
}
