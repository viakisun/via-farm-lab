import { describe, expect, it } from 'vitest';
import { initI18n } from '../i18n';
import enCommon from '../locales/en-AU/common.json';
import koCommon from '../locales/ko-KR/common.json';

describe('i18n', () => {
  it('initialises with en-AU as the default locale', () => {
    const i = initI18n({ locale: 'en-AU', detectFromBrowser: false });
    expect(i.language).toBe('en-AU');
    expect(i.t('common:app.name')).toBe('VIAFARM Digital Twin');
  });

  it('switches to ko-KR when requested', async () => {
    const i = initI18n({ detectFromBrowser: false });
    await i.changeLanguage('ko-KR');
    expect(i.t('common:app.name')).toBe('VIAFARM 디지털 트윈');
  });
});

describe('locale shape parity', () => {
  it('ko-KR mirrors en-AU keys exactly (no missing translations)', () => {
    const enKeys = flatten(enCommon);
    const koKeys = flatten(koCommon);
    expect(koKeys).toEqual(enKeys);
  });
});

function flatten(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>)
    .flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k))
    .sort();
}
