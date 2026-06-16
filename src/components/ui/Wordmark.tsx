import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '../../theme';
import { mono } from '../../theme/fonts';

/**
 * The Tesserone wordmark: the "05 bracket stack" mark + "tesserone." in mono.
 * Theme-aware — text follows colors.text, the accent dot + brackets use the accent —
 * so it works in both light and dark headers without separate assets.
 */
export function Wordmark({ size = 30 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
        <Path
          d="M170 132 H132 V380 H170"
          stroke={colors.accent}
          strokeWidth={18}
          strokeLinejoin="miter"
          strokeLinecap="square"
        />
        <Path
          d="M342 132 H380 V380 H342"
          stroke={colors.accent}
          strokeWidth={18}
          strokeLinejoin="miter"
          strokeLinecap="square"
        />
        <Rect x={184} y={170} width={144} height={54} rx={5} fill="#42A5F5" />
        <Rect x={184} y={232} width={144} height={54} rx={5} fill="#FFCA28" />
        <Rect x={184} y={294} width={144} height={54} rx={5} fill="#EF5350" />
      </Svg>
      <Text style={[styles.word, { color: colors.text }]}>
        tesserone<Text style={{ color: colors.accent }}>.</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  word: {
    fontFamily: mono.extrabold,
    fontSize: 22,
    letterSpacing: -1,
  },
});
