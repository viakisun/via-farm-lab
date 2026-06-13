import type { ScenarioTemplate } from '../domain/scenario';

export const cropCompare: ScenarioTemplate = {
  id: 'crop-compare',
  name: 'Crop Comparison',
  hypothesis:
    'Under standard CEA conditions (PPFD 250, EC 1.8, T 20°C), spinach and butter lettuce ' +
    'finish first; basil grows slowest because of its temperature preference.',
  description:
    'Single-factor crop type comparison. 5 treatments (one per crop) × 4 replicates = 20 plots; ' +
    'the remaining 4 plots stay empty for the demo.',
  designType: 'single-factor',
  factors: [
    {
      // Use PPFD as a stand-in factor with a single level — the real grouping
      // is the per-treatment cropId below.
      name: 'PPFD',
      unit: 'µmol/m²/s',
      levels: [250],
    },
  ],
  cropAssignment: 'byTreatmentFactor',
  treatmentCropIds: ['butter-lettuce', 'romaine-lettuce', 'basil', 'kale', 'spinach'],
  replicatesPerTreatment: 4,
  demo: {
    durationSimDays: 60,
    simSpeedMultiplier: 10000,
    cameraPreset: 'top-rotate',
  },
};
