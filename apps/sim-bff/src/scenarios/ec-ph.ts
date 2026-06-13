import type { ScenarioTemplate } from '../domain/scenario';

export const ecPh: ScenarioTemplate = {
  id: 'ec-ph',
  name: 'EC × pH Interaction',
  hypothesis:
    'Nutrient uptake optimum depends on pH. EC 2.0 + pH 5.8 yields more leaf area than EC 1.5 + pH 6.5.',
  description:
    'Two-factor full factorial on Romaine lettuce. Demonstrates how dosing ' +
    'pump pulse rate and basin water colour change with treatment.',
  designType: 'full-factorial',
  factors: [
    { name: 'EC', unit: 'mS/cm', levels: [1.5, 2.0] },
    { name: 'pH', unit: '', levels: [5.8, 6.5] },
  ],
  cropAssignment: 'uniform',
  uniformCropId: 'romaine-lettuce',
  replicatesPerTreatment: 6,
  demo: {
    durationSimDays: 30,
    simSpeedMultiplier: 10000,
    cameraPreset: 'closeup-dosing',
  },
};
