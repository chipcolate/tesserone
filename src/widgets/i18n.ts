import AsyncStorage from '@react-native-async-storage/async-storage';
import { i18n, initI18n, type LanguagePreference } from '../i18n';

/**
 * Android widgets render in the headless task / configuration activity, where
 * the app's root layout (which calls initI18n) never mounts. Initialize i18next
 * from the persisted language preference so widget strings localize correctly.
 * `initI18n` is idempotent and also handles a later language change.
 */
export async function ensureWidgetI18n(): Promise<typeof i18n> {
  let pref: LanguagePreference = 'system';
  try {
    const raw = await AsyncStorage.getItem('settings');
    if (raw) pref = JSON.parse(raw)?.state?.language ?? 'system';
  } catch {
    // fall back to system
  }
  initI18n(pref);
  return i18n;
}
