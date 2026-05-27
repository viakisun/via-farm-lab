// Type aliases derived from the en-AU resource so that `t(key)` is
// type-checked. Other locales must mirror the en-AU shape exactly.
import type enCommon from './locales/en-AU/common.json';

export type SupportedLocale = 'en-AU' | 'ko-KR';

/**
 * Compile-time set of translation keys.
 *
 * Generated from `common` namespace; expand the union when more namespaces
 * are added in subsequent PRs.
 */
export type TranslationKey =
  NestedKeyOf<typeof enCommon> extends infer K ? (K extends string ? `common.${K}` : never) : never;

type NestedKeyOf<T> =
  T extends Record<string, unknown>
    ? {
        [K in keyof T & string]: T[K] extends Record<string, unknown>
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K;
      }[keyof T & string]
    : never;
