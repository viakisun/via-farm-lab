import type { ScenarioTemplate } from '../domain/scenario';

export const coolWarmCO2: ScenarioTemplate = {
  id: 'cool-warm-co2',
  name: 'Cool vs Warm + CO₂',
  hypothesis:
    'Kale prefers cool (16°C) + ambient CO₂ (400 ppm). Warm + elevated CO₂ stresses the canopy ' +
    'and visibly drops colour-health.',
  description:
    'Two-factor full factorial on Kale. Demonstrates HVAC zone indicator and CO₂ mist particles.',
  designType: 'full-factorial',
  factors: [
    { name: 'T_air', unit: '°C', levels: [16, 24] },
    { name: 'CO2', unit: 'ppm', levels: [400, 1200] },
  ],
  cropAssignment: 'uniform',
  uniformCropId: 'kale',
  replicatesPerTreatment: 6,
  demo: {
    durationSimDays: 45,
    simSpeedMultiplier: 10000,
    cameraPreset: 'iso-hvac',
  },
};
