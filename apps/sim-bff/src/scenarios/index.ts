// Scenario catalogue — 4 pre-baked experimental templates.
import type { ScenarioTemplate } from '../domain/scenario';

import { coolWarmCO2 } from './cool-warm-co2';
import { cropCompare } from './crop-compare';
import { ecPh } from './ec-ph';
import { ledPpfd } from './led-ppfd';

export const SCENARIO_CATALOG: readonly ScenarioTemplate[] = [
  ledPpfd,
  ecPh,
  cropCompare,
  coolWarmCO2,
];

export function getScenario(id: string): ScenarioTemplate | undefined {
  return SCENARIO_CATALOG.find((s) => s.id === id);
}
