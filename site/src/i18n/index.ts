import { en } from './en';
import { it } from './it';
import { fr } from './fr';
import { es } from './es';
import { de } from './de';
import { DEFAULT_LOCALE, SITE_LOCALES, type Locale, type Strings } from './types';

export { DEFAULT_LOCALE, SITE_LOCALES, LOCALE_LABELS } from './types';
export type { Locale, Strings } from './types';

const STRINGS: Record<Locale, Strings> = { en, it, fr, es, de };

export function getStrings(locale: Locale | string | undefined): Strings {
  if (locale && (SITE_LOCALES as readonly string[]).includes(locale)) {
    return STRINGS[locale as Locale];
  }
  return STRINGS[DEFAULT_LOCALE];
}

/** Build a base-aware URL for a given locale + path fragment (no leading slash). */
export function localeUrl(baseUrl: string, locale: Locale, path = ''): string {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const suffix = path ? `/${path.replace(/^\//, '')}` : '';
  const url = `${base}${prefix}${suffix}`;
  return url || '/';
}
