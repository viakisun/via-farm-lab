import type { ScenarioTemplate } from '../domain/scenario';

export const ledPpfd: ScenarioTemplate = {
  id: 'led-ppfd',
  name: 'LED PPFD Ramp',
  hypothesis:
    'Butter lettuce biomass increases with PPFD up to a saturation point near 250-300 µmol/m²/s.',
  description:
    'Single-factor PPFD ramp from 100 to 400 µmol/m²/s in 100 µmol increments. ' +
    '4 treatments × 6 replicates fills all 24 plots.',
  designType: 'single-factor',
  factors: [
    {
      name: 'PPFD',
      unit: 'µmol/m²/s',
      levels: [100, 200, 300, 400],
    },
  ],
  cropAssignment: 'uniform',
  uniformCropId: 'butter-lettuce',
  replicatesPerTreatment: 6,
  demo: {
    durationSimDays: 30,
    simSpeedMultiplier: 10000,
    cameraPreset: 'iso-pan',
  },
};
