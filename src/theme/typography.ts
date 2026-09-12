import { TextStyle } from 'react-native';
import { mono } from './fonts';
import scale from '../../shared/tokens/typography.json';

type Weight = keyof typeof mono;
type Transform = NonNullable<TextStyle['textTransform']>;

type RoleToken = {
  fontSize: number;
  letterSpacing: number | null;
  lineHeight: number | null;
  textTransform: string | null;
  fontWeight: string;
};

function roleStyle(token: RoleToken): TextStyle {
  const style: TextStyle = {
    fontSize: token.fontSize,
    fontFamily: mono[token.fontWeight as Weight],
  };
  if (token.letterSpacing != null) style.letterSpacing = token.letterSpacing;
  if (token.lineHeight != null) style.lineHeight = token.lineHeight;
  if (token.textTransform != null) style.textTransform = token.textTransform as Transform;
  return style;
}

/**
 * All-in monospace type scale (JetBrains Mono). Weight is encoded by the family
 * name, not `fontWeight`, so faces stay consistent across platforms. Mono runs
 * wide, so larger scales get slight negative tracking to tighten them up.
 */
export const typography = {
  cardName: roleStyle(scale.cardName),
  barcode: roleStyle(scale.barcode),
  label: roleStyle(scale.label),
  sectionHeader: roleStyle(scale.sectionHeader),
  title: roleStyle(scale.title),
  body: roleStyle(scale.body),
  caption: roleStyle(scale.caption),
} as const satisfies Record<string, TextStyle>;
