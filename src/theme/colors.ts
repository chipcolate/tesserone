import tokens from '../../shared/tokens/colors.json';

/** Chipcolate brand purple — matches the Tesserone landing site accent. */
export const DEFAULT_ACCENT = tokens.defaultAccent;

export const DEFAULT_CARD_COLOR = tokens.defaultCardColor;

/** Card background when no explicit color and no brand primary. */
export const FALLBACK_CARD_BG = tokens.fallbackCardBg;

export const CARD_COLORS = tokens.cardColors;

export type CardColor = (typeof CARD_COLORS)[number];

/** W3C perceived brightness — true means use dark text on this background. */
export function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > tokens.lightTextOnColorThreshold;
}

export function textOnColor(hex: string): string {
  return isLightColor(hex) ? tokens.onLight : tokens.onDark;
}

export interface ColorTokens {
  bg: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  /** Hairline border / divider — the "Raw Aesthetics" elevation language. */
  border: string;
  /** Stronger border for focus / emphasis outlines. */
  borderStrong: string;
  /** Destructive action color. */
  danger: string;
  /** Text/icon color on top of `danger`. */
  dangerText: string;
}

export const darkColors: Omit<ColorTokens, 'accent'> = tokens.dark;
export const lightColors: Omit<ColorTokens, 'accent'> = tokens.light;
