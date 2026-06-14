import { describe, expect, it } from 'vitest';

import { disorderCount, INITIAL_SOP, photoCount, sopReducer, type SopState } from '../sop';

describe('sop reducer', () => {
  it('advances steps and clamps prev at 1', () => {
    let s = INITIAL_SOP;
    s = sopReducer(s, { type: 'next' });
    expect(s.step).toBe(2);
    s = sopReducer(s, { type: 'prev' });
    s = sopReducer(s, { type: 'prev' });
    expect(s.step).toBe(1);
  });

  it('selecting a treatment resets completed plants', () => {
    const s = sopReducer({ ...INITIAL_SOP, done: [1, 2] }, { type: 'treatment', id: 'B-2' });
    expect(s.treatment).toBe('B-2');
    expect(s.done).toEqual([]);
  });

  it('measurement steppers never go below zero', () => {
    let s: SopState = { ...INITIAL_SOP, meas: { height: 0.5, leaves: 0, weight: 1 } };
    s = sopReducer(s, { type: 'height', delta: -0.5 });
    s = sopReducer(s, { type: 'leaves', delta: -1 });
    s = sopReducer(s, { type: 'weight', delta: -1 });
    expect(s.meas).toEqual({ height: 0, leaves: 0, weight: 0 });
  });

  it('height keeps one decimal place', () => {
    const s = sopReducer(INITIAL_SOP, { type: 'height', delta: 0.5 });
    expect(s.meas.height).toBe(19);
  });

  it('submitting from step 5 saves the plant, advances, and resets the form', () => {
    const s5: SopState = {
      ...INITIAL_SOP,
      step: 5,
      sample: 2,
      done: [1],
      photos: { top: true, side: true, macro: true },
      env: true,
    };
    const s = sopReducer(s5, { type: 'next' });
    expect(s.done).toEqual([1, 2]);
    expect(s.sample).toBe(3);
    expect(s.step).toBe(1);
    expect(photoCount(s.photos)).toBe(0);
    expect(s.env).toBe(false);
    expect(disorderCount(s.dz)).toBe(0);
  });

  it('does not advance past plant 5', () => {
    const s5: SopState = { ...INITIAL_SOP, step: 5, sample: 5, done: [1, 2, 3, 4] };
    const s = sopReducer(s5, { type: 'next' });
    expect(s.sample).toBe(5);
    expect(s.done).toContain(5);
  });

  it('toggles photos and env', () => {
    let s = sopReducer(INITIAL_SOP, { type: 'photo', key: 'side' });
    expect(s.photos.side).toBe(true);
    s = sopReducer(s, { type: 'env' });
    expect(s.env).toBe(true);
  });
});
