import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { en } from './locales/en';
import { it } from './locales/it';
import { fr } from './locales/fr';
import { es } from './locales/es';
import { de } from './locales/de';
import {
  APP_LANGUAGES,
  DEFAULT_LANGUAGE,
  resolveSystemLanguage,
  type AppLanguage,
  type LanguagePreference,
} from './languages';

export type { AppLanguage, LanguagePreference } from './languages';
export { APP_LANGUAGES, DEFAULT_LANGUAGE, LANGUAGE_LABELS, resolveSystemLanguage } from './languages';

const resources = {
  en: { translation: en },
  it: { translation: it },
  fr: { translation: fr },
  es: { translation: es },
  de: { translation: de },
};

export function getDeviceLanguage(): AppLanguage {
  const locales = getLocales();
  return resolveSystemLanguage(locales[0]?.languageTag ?? locales[0]?.languageCode);
}

export function resolvePreference(pref: LanguagePreference): AppLanguage {
  return pref === 'system' ? getDeviceLanguage() : pref;
}

let initialized = false;

export function initI18n(pref: LanguagePreference) {
  const lng = resolvePreference(pref);
  if (!initialized) {
    i18n
      .use(initReactI18next)
      .init({
        resources,
        lng,
        fallbackLng: DEFAULT_LANGUAGE,
        supportedLngs: APP_LANGUAGES as unknown as string[],
        interpolation: { escapeValue: false },
        returnNull: false,
        compatibilityJSON: 'v4',
      });
    initialized = true;
  } else if (i18n.language !== lng) {
    i18n.changeLanguage(lng);
  }
}

export function setLanguagePreference(pref: LanguagePreference) {
  const lng = resolvePreference(pref);
  if (initialized && i18n.language !== lng) {
    i18n.changeLanguage(lng);
  }
}

export { useTranslation } from 'react-i18next';
export { i18n };
