import { describe, expect, it } from 'vitest';
import type { ApiError, Page, PlotId } from '../common';

describe('common types', () => {
  it('PlotId is a string', () => {
    const id: PlotId = 'pilot.syd.a.r01.t02.p03';
    expect(typeof id).toBe('string');
  });

  it('Page<T> is generic', () => {
    const page: Page<number> = { items: [1, 2, 3], nextCursor: null, total: 3 };
    expect(page.items.length).toBe(3);
  });

  it('ApiError shape', () => {
    const err: ApiError = {
      type: 'https://errors.viafarm.com.au/not-found',
      title: 'Not Found',
      status: 404,
    };
    expect(err.status).toBe(404);
  });
});
