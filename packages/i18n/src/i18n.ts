import i18next, { type i18n as I18n } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './locales';
import enCommon from './locales/en-AU/common.json';
import koCommon from './locales/ko-KR/common.json';
import type { SupportedLocale } from './types';

let initialised = false;

export interface InitI18nOptions {
  /** Override detected locale. Useful for SSR or tests. */
  readonly locale?: SupportedLocale;
  /** Disable browser detection (used in SSR / Node environments). */
  readonly detectFromBrowser?: boolean;
}

export function initI18n(opts: InitI18nOptions = {}): I18n {
  if (initialised) {
    return i18next;
  }
  initialised = true;

  const i18nInstance = i18next.createInstance();
  if (opts.detectFromBrowser !== false) {
    i18nInstance.use(LanguageDetector);
  }
  i18nInstance.use(initReactI18next);

  void i18nInstance.init({
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    resources: {
      'en-AU': { common: enCommon },
      'ko-KR': { common: koCommon },
    },
    ...(opts.locale ? { lng: opts.locale } : {}),
  });

  // Share globally for non-React consumers.
  Object.assign(i18next, i18nInstance);
  return i18nInstance;
}

export const i18n = i18next;
