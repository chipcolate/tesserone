import { TextStyle } from 'react-native';
import { mono } from './fonts';

/**
 * All-in monospace type scale (JetBrains Mono). Weight is encoded by the family
 * name, not `fontWeight`, so faces stay consistent across platforms. Mono runs
 * wide, so larger scales get slight negative tracking to tighten them up.
 */
export const typography = {
  cardName: {
    fontSize: 18,
    fontFamily: mono.medium,
    letterSpacing: -0.2,
  },

  barcode: {
    fontSize: 16,
    fontFamily: mono.regular,
    letterSpacing: 1.5,
  },

  label: {
    fontSize: 14,
    fontFamily: mono.regular,
  },

  sectionHeader: {
    fontSize: 13,
    fontFamily: mono.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  title: {
    fontSize: 28,
    fontFamily: mono.bold,
    letterSpacing: -0.8,
  },

  body: {
    fontSize: 16,
    fontFamily: mono.regular,
    lineHeight: 22,
  },

  caption: {
    fontSize: 12,
    fontFamily: mono.regular,
  },
} as const satisfies Record<string, TextStyle>;
