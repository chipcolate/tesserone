import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

/**
 * Standard modal bottom button row. Consistent gap + safe-area padding + a top
 * hairline that separates it from scrolling content. Compose `Button`s inside;
 * keep the primary (accent) action right-most and any destructive action
 * visually separated on the left.
 */
export function ActionBar({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: insets.bottom + 12, borderTopColor: colors.border, backgroundColor: colors.bg },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
