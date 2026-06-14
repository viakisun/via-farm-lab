// Deterministic mock dataset for the Web Console — ported from the design
// prototype's seeded LCG so the derived numbers and the "20h wins" recommendation
// stay stable across reloads. No network: this is the only data source for now.
//
// Content is localised en-AU (crops, trials, locations, market sources); the
// numeric generation is kept identical to the design so chart proportions match.

export type ExperimentStatus = 'Complete' | 'Running';

export interface Experiment {
  readonly id: string;
  readonly trial: string;
  readonly crop: string;
  readonly cv: string;
  readonly p: number; // photoperiod hours
  readonly ppfd: number;
  readonly dli: number;
  readonly status: ExperimentStatus;
  readonly done: boolean;
  readonly bed: string;
  readonly tipburn: number;
  readonly sellable: number;
  readonly fw: number; // fresh weight g
  readonly bedDays: number;
  readonly ppbd: number; // profit per bed-day (won-scale; formatted to A$ in derive)
  readonly profit: number;
  readonly costKg: number;
  readonly validation: number;
  readonly improvement: number;
  readonly energy: number;
  readonly waterL: number;
  readonly nutrientL: number;
  readonly dat: number; // days after transplant
  readonly start: string;
  readonly end: string;
  recommended?: boolean;
}

export type MeasurementKind = 'measured' | 'manual' | 'outlier' | 'invalid';

export interface Measurement {
  readonly date: string;
  readonly sample: string;
  readonly metric: string;
  readonly value: string;
  readonly status: string;
  readonly kind: MeasurementKind;
  readonly method: string;
}

export interface Device {
  readonly sys: 'Light' | 'Nutrient' | 'Climate' | 'Safety' | 'Energy' | 'Flow';
  readonly model: string;
  readonly loc: string;
  readonly metric: string;
  readonly status: 'Measured' | 'Pending';
}

export interface Dataset {
  readonly exps: Experiment[];
  readonly recId: string;
  readonly meas: Measurement[];
  readonly devices: Device[];
}

const TARGET_DLI = 12.96;

/** Assert an indexed lookup that is an invariant in this fixed-size dataset. */
function req<T>(v: T | undefined): T {
  if (v === undefined) throw new Error('dataset: unexpected undefined index');
  return v;
}

function build(): Dataset {
  let s = 4242;
  const rnd = (): number => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const ri = (a: number, b: number): number => a + Math.floor(rnd() * (b - a + 1));
  const pad = (n: number): string => String(n).padStart(2, '0');

  const crops: [string, string][] = [
    ['Butterhead', 'Rex'],
    ['Cos', 'Casey'],
    ['Red Oak', 'Adam'],
    ['Green Coral', 'Cheong'],
    ['Batavia', 'Nika'],
  ];
  const doneTrials = ['M1 Photoperiod', 'L3 Nutrient', 'C2 CO₂', 'N4 Nitrogen'];
  const periods = [12, 16, 20, 24];
  const baseP: Record<number, number> = { 12: 7600, 16: 8700, 20: 9850, 24: 8150 };
  const baseC: Record<number, number> = { 12: 2880, 16: 2510, 20: 2340, 24: 2690 };
  const baseFW: Record<number, number> = { 12: 118, 16: 136, 20: 144, 24: 152 };
  const beds = ['A-1', 'A-2', 'B-1', 'B-2', 'C-1', 'C-2'];

  const exps: Experiment[] = [];
  for (let i = 0; i < 25; i++) {
    const done = i < 20;
    const p = req(periods[i % 4]);
    const cr = req(crops[i % 5]);
    const trial = done ? req(doneTrials[Math.floor(i / 5) % 4]) : 'M3 Photoperiod';
    const ppfd = Math.round((TARGET_DLI * 1e6) / (p * 3600));
    const dli = +((ppfd * p * 3600) / 1e6).toFixed(2);
    const tipburn = p === 24 ? ri(8, 13) : p === 20 ? ri(3, 6) : ri(1, 4);
    const sellable = Math.max(78, 96 - tipburn + ri(-1, 2));
    const fw = req(baseFW[p]) + ri(-6, 8);
    const bedDays = ri(40, 46);
    const ppbd = Math.max(6900, req(baseP[p]) + ri(-450, 450) - (tipburn > 8 ? 650 : 0));
    const profit = ppbd * bedDays;
    const costKg = req(baseC[p]) + ri(-170, 170);
    const validation = done ? ri(86, 98) : ri(70, 84);
    const improvement = +(((ppbd - req(baseP[16])) / req(baseP[16])) * 100).toFixed(1);
    const energy = +((p === 12 ? 18 : p === 16 ? 21 : p === 20 ? 23 : 27) + rnd() * 3).toFixed(1);
    const waterL = ri(46, 58);
    const nutrientL = ri(20, 30);
    const dat = done ? bedDays : ri(16, 34);
    const sm = 1 + (i % 9);
    const sd = 3 + (i % 18);
    exps.push({
      id: 'VF-' + String(101 + i),
      trial,
      crop: cr[0],
      cv: cr[1],
      p,
      ppfd,
      dli,
      status: done ? 'Complete' : 'Running',
      done,
      bed: req(beds[i % 6]),
      tipburn,
      sellable,
      fw,
      bedDays,
      ppbd,
      profit,
      costKg,
      validation,
      improvement,
      energy,
      waterL,
      nutrientL,
      dat,
      start: `${pad(sd)}/${pad(sm)}/26`,
      end: `${pad(sd)}/${pad(sm + 1)}/26`,
    });
  }
  const rec = exps.filter((e) => e.done).reduce((a, b) => (b.ppbd > a.ppbd ? b : a));
  rec.recommended = true;

  // Measurements for the Data Review module.
  const mm: [string, string, number, number][] = [
    ['Fresh weight', 'g', 120, 160],
    ['Leaf count', '', 11, 17],
    ['Plant height', 'cm', 14, 22],
    ['Tipburn', '%', 0, 9],
  ];
  const meas: Measurement[] = [];
  for (let i = 0; i < 18; i++) {
    const m = req(mm[i % 4]);
    const day = 3 + ((i * 2) % 26);
    rnd();
    let status = 'Measured';
    let kind: MeasurementKind = 'measured';
    if (i === 4 || i === 11) {
      status = 'Outlier';
      kind = 'outlier';
    } else if (i === 7 || i === 16) {
      status = 'Invalid';
      kind = 'invalid';
    } else if (i === 2 || i === 9 || i === 14) {
      status = 'Manual';
      kind = 'manual';
    }
    const n = ri(m[2], m[3]);
    meas.push({
      date: `${pad(day)}/06`,
      sample: '#' + (1 + (i % 5)),
      metric: m[0],
      value: m[1] ? `${n} ${m[1]}` : `${n}`,
      status,
      kind,
      method: i % 4 < 2 ? 'Non-destructive' : 'Destructive',
    });
  }

  const devices: Device[] = [
    {
      sys: 'Light',
      model: 'PPFD SEN0641',
      loc: 'Glasshouse A · canopy',
      metric: 'PPFD / DLI',
      status: 'Measured',
    },
    {
      sys: 'Light',
      model: 'LED MX20 18W',
      loc: 'A-1–B-2 circuit',
      metric: 'Photoperiod / PPFD',
      status: 'Measured',
    },
    {
      sys: 'Nutrient',
      model: 'EC/pH RS485',
      loc: 'Nutrient tank',
      metric: 'EC · pH',
      status: 'Measured',
    },
    {
      sys: 'Nutrient',
      model: 'TL-136 level sensor',
      loc: 'Nutrient tank',
      metric: 'Tank level',
      status: 'Measured',
    },
    {
      sys: 'Nutrient',
      model: 'Feed/circ./drain pumps',
      loc: 'Pipe line',
      metric: 'Pump status',
      status: 'Measured',
    },
    {
      sys: 'Climate',
      model: 'SHT40',
      loc: 'Glasshouse A · centre',
      metric: 'Temp · Humidity',
      status: 'Measured',
    },
    {
      sys: 'Climate',
      model: 'SCD41',
      loc: 'Glasshouse A · centre',
      metric: 'CO₂',
      status: 'Measured',
    },
    {
      sys: 'Climate',
      model: 'KEEP AC',
      loc: 'Glasshouse A',
      metric: 'HVAC control',
      status: 'Measured',
    },
    {
      sys: 'Climate',
      model: 'Circulation fan',
      loc: 'Glasshouse A',
      metric: 'Airflow',
      status: 'Pending',
    },
    {
      sys: 'Safety',
      model: 'YL-83 leak sensor',
      loc: 'Floor A/B zone',
      metric: 'Leak detection',
      status: 'Measured',
    },
    {
      sys: 'Energy',
      model: 'Circuit power meter',
      loc: 'Switchboard',
      metric: 'Per-circuit kWh',
      status: 'Pending',
    },
    { sys: 'Flow', model: 'Flow sensor', loc: 'Supply line', metric: 'Flow L', status: 'Pending' },
  ];

  return { exps, recId: rec.id, meas, devices };
}

export const DATASET: Dataset = build();
