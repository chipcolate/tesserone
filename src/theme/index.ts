import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../stores/settings';
import { ColorTokens, darkColors, lightColors, DEFAULT_ACCENT } from './colors';
import { typography } from './typography';

export { CARD_COLORS, isLightColor, textOnColor, DEFAULT_CARD_COLOR } from './colors';
export { typography } from './typography';

export interface Theme {
  dark: boolean;
  colors: ColorTokens;
  typography: typeof typography;
  setAccent: (color: string) => void;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const [accent, setAccentState] = useState(DEFAULT_ACCENT);

  const setAccent = useCallback((color: string) => {
    setAccentState(color);
  }, []);

  const dark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  const theme = useMemo<Theme>(
    () => ({
      dark,
      colors: {
        ...(dark ? darkColors : lightColors),
        accent,
      },
      typography,
      setAccent,
    }),
    [dark, accent, setAccent]
  );

  return React.createElement(ThemeContext.Provider, { value: theme }, children);
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme;
}
