import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, ThemeMode, SortMode } from '../types';
import { setLanguagePreference, type LanguagePreference } from '../i18n';

type SettingsState = Settings & {
  setThemeMode: (mode: ThemeMode) => void;
  setSortMode: (mode: SortMode) => void;
  setLanguage: (pref: LanguagePreference) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      sortMode: 'manual',
      language: 'system',
      setThemeMode: (themeMode) => set({ themeMode }),
      setSortMode: (sortMode) => set({ sortMode }),
      setLanguage: (language) => {
        set({ language });
        setLanguagePreference(language);
      },
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persisted: unknown, version) => {
        const state = (persisted ?? {}) as Partial<SettingsState>;
        if (version < 2) {
          return { ...state, language: state.language ?? 'system' } as SettingsState;
        }
        return state as SettingsState;
      },
    }
  )
);
