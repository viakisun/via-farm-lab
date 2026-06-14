import type { TreatmentId } from './data';

export type Severity = 'neg' | 'mild' | 'sev';
export type DisorderKey = 'deformity' | 'tipburn' | 'bolting' | 'chlorosis';
export type PhotoKey = 'top' | 'side' | 'macro';
export type SopStep = 1 | 2 | 3 | 4 | 5;

export interface SopState {
  readonly step: SopStep;
  readonly treatment: TreatmentId;
  readonly sample: number;
  readonly done: number[];
  readonly dz: Record<DisorderKey, Severity>;
  readonly meas: { readonly height: number; readonly leaves: number; readonly weight: number };
  readonly photos: Record<PhotoKey, boolean>;
  readonly env: boolean;
}

export const INITIAL_SOP: SopState = {
  step: 1,
  treatment: 'A-2',
  sample: 1,
  done: [1],
  dz: { deformity: 'neg', tipburn: 'mild', bolting: 'neg', chlorosis: 'neg' },
  meas: { height: 18.5, leaves: 14, weight: 142 },
  photos: { top: true, side: false, macro: false },
  env: false,
};

const clamp0 = (x: number): number => (x < 0 ? 0 : x);
const round1 = (x: number): number => +x.toFixed(1);

export type SopAction =
  | { type: 'step'; step: SopStep }
  | { type: 'treatment'; id: TreatmentId }
  | { type: 'sample'; n: number }
  | { type: 'dz'; key: DisorderKey; value: Severity }
  | { type: 'height'; delta: number }
  | { type: 'leaves'; delta: number }
  | { type: 'weight'; delta: number }
  | { type: 'photo'; key: PhotoKey }
  | { type: 'env' }
  | { type: 'prev' }
  | { type: 'next' };

export function sopReducer(s: SopState, a: SopAction): SopState {
  switch (a.type) {
    case 'step':
      return { ...s, step: a.step };
    case 'treatment':
      return { ...s, treatment: a.id, done: [] };
    case 'sample':
      return { ...s, sample: a.n };
    case 'dz':
      return { ...s, dz: { ...s.dz, [a.key]: a.value } };
    case 'height':
      return { ...s, meas: { ...s.meas, height: clamp0(round1(s.meas.height + a.delta)) } };
    case 'leaves':
      return { ...s, meas: { ...s.meas, leaves: clamp0(s.meas.leaves + a.delta) } };
    case 'weight':
      return { ...s, meas: { ...s.meas, weight: clamp0(s.meas.weight + a.delta) } };
    case 'photo':
      return { ...s, photos: { ...s.photos, [a.key]: !s.photos[a.key] } };
    case 'env':
      return { ...s, env: !s.env };
    case 'prev':
      return { ...s, step: (s.step > 1 ? s.step - 1 : 1) as SopStep };
    case 'next': {
      if (s.step < 5) return { ...s, step: (s.step + 1) as SopStep };
      // Step 5 primary = save sample, advance to next plant, reset the form.
      const done = Array.from(new Set([...s.done, s.sample]));
      const sample = s.sample < 5 ? s.sample + 1 : s.sample;
      return {
        ...s,
        done,
        sample,
        step: 1,
        dz: { deformity: 'neg', tipburn: 'neg', bolting: 'neg', chlorosis: 'neg' },
        photos: { top: false, side: false, macro: false },
        env: false,
      };
    }
    default:
      return s;
  }
}

export const disorderCount = (dz: SopState['dz']): number =>
  Object.values(dz).filter((v) => v !== 'neg').length;
export const photoCount = (photos: SopState['photos']): number =>
  Object.values(photos).filter(Boolean).length;
