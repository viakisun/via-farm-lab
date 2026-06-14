import { C } from './theme';

export type ScreenId = 'overview' | 'experiment' | 'inputs' | 'sensors' | 'sop' | 'incident';
export type TreatmentId = 'A-2' | 'A-1' | 'B-1' | 'B-2';

export interface Treatment {
  readonly id: TreatmentId;
  readonly photo: string; // photoperiod label, e.g. "20h"
  readonly ppfd: string;
  readonly profit: number; // won-scale (formatted to A$ via theme.audAmt)
  readonly ppbd: number;
  readonly costkg: number;
  readonly yld: number;
  readonly sellable: number;
  readonly best: boolean;
  readonly note: string;
  // portfolio card
  readonly score: number; // 수익지수, 0..100
  readonly fw: number; // fresh weight g
  readonly disorder: number; // 생육장해 %
  readonly badge?: string;
  readonly badgeColor?: string;
  readonly ringColor: string;
  readonly statusText: string;
  readonly statusColor: string;
  readonly fwColor?: string;
}

export const TREATMENTS: Record<TreatmentId, Treatment> = {
  'A-2': {
    id: 'A-2',
    photo: '20h',
    ppfd: '180',
    profit: 412000,
    ppbd: 9800,
    costkg: 2340,
    yld: 18.6,
    sellable: 93,
    best: true,
    note: '20h · top profit · best growth/quality balance',
    score: 100,
    fw: 142,
    disorder: 4,
    badge: 'BEST',
    badgeColor: C.lime,
    ringColor: C.lime,
    statusText: 'Verified PASS · 6/8 Measured',
    statusColor: C.lime,
  },
  'A-1': {
    id: 'A-1',
    photo: '16h',
    ppfd: '225',
    profit: 372000,
    ppbd: 8720,
    costkg: 2510,
    yld: 17.4,
    sellable: 91,
    best: false,
    note: '16h Control · experiment baseline',
    score: 89,
    fw: 138,
    disorder: 5,
    badge: 'CONTROL',
    badgeColor: C.sky,
    ringColor: C.lime,
    statusText: 'Verified PASS · baseline control',
    statusColor: C.lime,
  },
  'B-1': {
    id: 'B-1',
    photo: '12h',
    ppfd: '300',
    profit: 318000,
    ppbd: 7570,
    costkg: 2880,
    yld: 15.1,
    sellable: 95,
    best: false,
    note: '12h · low growth · stable high quality',
    score: 76,
    fw: 119,
    disorder: 3,
    ringColor: C.lime,
    statusText: 'Verified PASS · stable quality',
    statusColor: C.lime,
  },
  'B-2': {
    id: 'B-2',
    photo: '24h',
    ppfd: '150',
    profit: 339000,
    ppbd: 8070,
    costkg: 2690,
    yld: 19.2,
    sellable: 84,
    best: false,
    note: '24h · max growth · high tipburn risk',
    score: 82,
    fw: 151,
    disorder: 11,
    badge: 'WARN',
    badgeColor: C.amber,
    ringColor: C.amber,
    statusText: 'Tipburn risk · Quality Gate caution',
    statusColor: C.amber,
    fwColor: C.lime,
  },
};

export const TREATMENT_ORDER: TreatmentId[] = ['A-2', 'A-1', 'B-1', 'B-2'];

export interface NavTab {
  readonly id: ScreenId;
  readonly label: string;
  readonly title: string;
}

export const NAV_TABS: NavTab[] = [
  { id: 'overview', label: 'Economic', title: 'Economic Overview' },
  { id: 'experiment', label: 'Experiment', title: 'Experiment Brief' },
  { id: 'inputs', label: 'Inputs', title: 'Input Verification' },
  { id: 'sensors', label: 'Sensors', title: 'Sensor Intelligence' },
  { id: 'sop', label: 'Guided SOP', title: 'Guided SOP' },
  { id: 'incident', label: 'Incident', title: 'Incident Response' },
];
