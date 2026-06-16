import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme, typography } from '../../theme';
import { CHROME_RADIUS } from '../../theme/geometry';
import type { BrandEntry } from '../../services/logos';

/**
 * Brand-match suggestions for the card-name field. Rendered directly under the
 * name input (the search is driven by the name), not the logo section.
 */
export function BrandResults({
  results,
  selectedSlug,
  onSelect,
}: {
  results: BrandEntry[];
  selectedSlug?: string;
  onSelect: (brand: BrandEntry) => void;
}) {
  const { colors } = useTheme();
  if (results.length === 0) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {results.map((b, idx) => {
        const selected = b.slug === selectedSlug;
        return (
          <Pressable
            key={b.slug}
            style={[
              styles.row,
              idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
              selected && { backgroundColor: colors.bg },
            ]}
            onPress={() => onSelect(b)}
          >
            <View style={[styles.dot, { backgroundColor: b.primaryColor }]} />
            <Text style={[typography.label, { color: colors.text, flex: 1 }]}>{b.name}</Text>
            {selected ? <Text style={[typography.label, { color: colors.accent }]}>✓</Text> : null}
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 8,
    borderRadius: CHROME_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: CHROME_RADIUS,
  },
});
