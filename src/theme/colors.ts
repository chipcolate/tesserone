// Backgrounds
export const DARK_BG = '#0A0A0A';
export const LIGHT_BG = '#FAFAF8';

// Surface (cards, sheets, overlays)
export const DARK_SURFACE = '#161616';
export const LIGHT_SURFACE = '#F0F0ED';

// Text
export const DARK_TEXT = '#F5F5F5';
export const LIGHT_TEXT = '#1A1A1A';

export const DARK_TEXT_SECONDARY = '#888888';
export const LIGHT_TEXT_SECONDARY = '#666666';

// Default accent (warm neutral, used when no card is selected)
export const DEFAULT_ACCENT = '#A0917B';

// Default card color
export const DEFAULT_CARD_COLOR = '#42A5F5';

// 24 card colors grouped by hue
export const CARD_COLORS = [
  // Reds
  '#EF5350', '#D32F2F',
  // Pinks
  '#EC407A', '#C2185B',
  // Purples
  '#AB47BC', '#7B1FA2',
  // Indigos
  '#5C6BC0', '#303F9F',
  // Blues
  '#42A5F5', '#1565C0',
  // Cyans
  '#26C6DA', '#00838F',
  // Greens
  '#66BB6A', '#2E7D32',
  // Limes
  '#9CCC65', '#689F38',
  // Yellows
  '#FFCA28', '#F9A825',
  // Oranges
  '#FFA726', '#E65100',
  // Browns
  '#8D6E63', '#4E342E',
  // Greys
  '#78909C', '#37474F',
  // Neutrals
  '#000000', '#CCCCCC', '#FFFFFF',
] as const;

export type CardColor = (typeof CARD_COLORS)[number];

/**
 * Returns true if the hex color is light (use dark text on it).
 * Uses the W3C perceived brightness formula.
 */
export function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

/**
 * Returns appropriate text color for a given background.
 */
export function textOnColor(hex: string): string {
  return isLightColor(hex) ? '#000000' : '#FFFFFF';
}

export interface ColorTokens {
  bg: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
}

export const darkColors: Omit<ColorTokens, 'accent'> = {
  bg: DARK_BG,
  surface: DARK_SURFACE,
  text: DARK_TEXT,
  textSecondary: DARK_TEXT_SECONDARY,
};

export const lightColors: Omit<ColorTokens, 'accent'> = {
  bg: LIGHT_BG,
  surface: LIGHT_SURFACE,
  text: LIGHT_TEXT,
  textSecondary: LIGHT_TEXT_SECONDARY,
};
