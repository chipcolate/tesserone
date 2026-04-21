export const APP_LANGUAGES = ['en', 'it', 'fr', 'es', 'de'] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];
export type LanguagePreference = 'system' | AppLanguage;

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: 'English',
  it: 'Italiano',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
};

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

export function isAppLanguage(code: string): code is AppLanguage {
  return (APP_LANGUAGES as readonly string[]).includes(code);
}

export function resolveSystemLanguage(systemLocale: string | null | undefined): AppLanguage {
  if (!systemLocale) return DEFAULT_LANGUAGE;
  const primary = systemLocale.split(/[-_]/)[0]?.toLowerCase();
  return primary && isAppLanguage(primary) ? primary : DEFAULT_LANGUAGE;
}
