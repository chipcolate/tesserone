import { Platform, TextStyle } from 'react-native';

const mono: TextStyle['fontFamily'] = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
});

export const typography = {
  cardName: {
    fontSize: 18,
    fontWeight: '500',
  } as TextStyle,

  barcode: {
    fontSize: 16,
    fontFamily: mono,
    letterSpacing: 1.5,
  } as TextStyle,

  label: {
    fontSize: 14,
    fontWeight: '400',
  } as TextStyle,

  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  } as TextStyle,

  title: {
    fontSize: 28,
    fontWeight: '700',
  } as TextStyle,

  body: {
    fontSize: 16,
    fontWeight: '400',
  } as TextStyle,

  caption: {
    fontSize: 12,
    fontWeight: '400',
  } as TextStyle,
} as const;
