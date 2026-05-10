import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, ThemeMode, SortMode, AnimationsLevel } from '../types';
import { setLanguagePreference, type LanguagePreference } from '../i18n';

type SettingsState = Settings & {
  setThemeMode: (mode: ThemeMode) => void;
  setSortMode: (mode: SortMode) => void;
  setLanguage: (pref: LanguagePreference) => void;
  setAnimationsLevel: (level: AnimationsLevel) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      sortMode: 'manual',
      language: 'system',
      animationsLevel: 'normal',
      setThemeMode: (themeMode) => set({ themeMode }),
      setSortMode: (sortMode) => set({ sortMode }),
      setLanguage: (language) => {
        set({ language });
        setLanguagePreference(language);
      },
      setAnimationsLevel: (animationsLevel) => set({ animationsLevel }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (persisted: unknown, version) => {
        const state = (persisted ?? {}) as Partial<SettingsState>;
        if (version < 2) {
          state.language = state.language ?? 'system';
        }
        if (version < 3) {
          state.animationsLevel = state.animationsLevel ?? 'normal';
        }
        return state as SettingsState;
      },
    }
  )
);
