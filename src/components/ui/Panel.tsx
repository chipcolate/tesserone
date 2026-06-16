import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { CHROME_RADIUS } from '../../theme/geometry';

/**
 * Bordered, squared surface — the workhorse of the "Raw Aesthetics" chrome.
 * Replaces filled `colors.surface` blocks with a hairline-bordered box.
 */
export function Panel({ style, children, ...rest }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      {...rest}
      style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: CHROME_RADIUS,
    overflow: 'hidden',
  },
});
