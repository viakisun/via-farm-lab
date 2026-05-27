// Locale metadata. Keep aligned with LOCALISATION.md §3.
import type { SupportedLocale } from './types';

export const DEFAULT_LOCALE: SupportedLocale = 'en-AU';

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['en-AU', 'ko-KR'] as const;

export const LOCALE_LABELS: Readonly<Record<SupportedLocale, string>> = {
  'en-AU': 'English (Australia)',
  'ko-KR': '한국어',
};

export const LOCALE_DATE_FORMATS: Readonly<
  Record<SupportedLocale, { short: string; long: string }>
> = {
  // DD/MM/YYYY per LOCALISATION §3.1
  'en-AU': { short: 'dd/MM/yyyy', long: 'd MMMM yyyy' },
  // YYYY-MM-DD for internal Korean operations team
  'ko-KR': { short: 'yyyy-MM-dd', long: 'yyyy년 M월 d일' },
};
