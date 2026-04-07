import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, ThemeMode, SortMode } from '../types';

type SettingsState = Settings & {
  setThemeMode: (mode: ThemeMode) => void;
  setSortMode: (mode: SortMode) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      sortMode: 'manual',
      setThemeMode: (themeMode) => set({ themeMode }),
      setSortMode: (sortMode) => set({ sortMode }),
    }),
    { name: 'settings', storage: createJSONStorage(() => AsyncStorage) }
  )
);
