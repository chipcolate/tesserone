import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useCardsStore, getSortedCards } from '../src/stores/cards';
import { useSettingsStore } from '../src/stores/settings';
import { useTheme, typography, textOnColor } from '../src/theme';
import { CardStack } from '../src/components/wallet/CardStack';

const SPRING = { damping: 18, stiffness: 260 } as const;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { cards } = useCardsStore();
  const { sortMode } = useSettingsStore();

  // 0 = closed, 1 = open
  const fabProgress = useSharedValue(0);

  const toggle = useCallback(() => {
    fabProgress.value = withSpring(
      fabProgress.value < 0.5 ? 1 : 0,
      SPRING
    );
  }, [fabProgress]);

  const close = useCallback(() => {
    fabProgress.value = withSpring(0, SPRING);
  }, [fabProgress]);

  const cardsList = getSortedCards(cards, sortMode);

  // Scrim fade
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: fabProgress.value,
    pointerEvents: fabProgress.value > 0.01 ? 'auto' as const : 'none' as const,
  }));

  // FAB rotation
  const fabIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(fabProgress.value, [0, 1], [0, 90])}deg` }],
  }));

  // Menu items stagger from bottom
  const menuItem1Style = useAnimatedStyle(() => {
    const visible = fabProgress.value > 0.5;
    return {
      opacity: interpolate(fabProgress.value, [0, 0.5, 1], [0, 0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(fabProgress.value, [0, 1], [30, 0], Extrapolation.CLAMP) },
        { scale: interpolate(fabProgress.value, [0, 0.5, 1], [0.8, 0.8, 1], Extrapolation.CLAMP) },
      ],
      pointerEvents: visible ? 'auto' as const : 'none' as const,
    };
  });

  const menuItem2Style = useAnimatedStyle(() => {
    const visible = fabProgress.value > 0.3;
    return {
      opacity: interpolate(fabProgress.value, [0, 0.3, 0.8], [0, 0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(fabProgress.value, [0, 1], [50, 0], Extrapolation.CLAMP) },
        { scale: interpolate(fabProgress.value, [0, 0.3, 0.8], [0.8, 0.8, 1], Extrapolation.CLAMP) },
      ],
      pointerEvents: visible ? 'auto' as const : 'none' as const,
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[typography.title, { color: colors.text }]}>Tesserone</Text>
      </View>

      <View style={styles.stackWrap}>
        {cardsList.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>+</Text>
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
              Add your first card
            </Text>
          </View>
        ) : (
          <CardStack cards={cardsList} />
        )}
      </View>

      {/* Scrim */}
      <Animated.View style={[styles.scrim, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      {/* Menu items */}
      <View style={[styles.fabMenu, { bottom: insets.bottom + 80 }]} pointerEvents="box-none">
        <Animated.View style={menuItem2Style}>
          <Pressable
            style={[styles.fabMenuItem, { backgroundColor: colors.surface }]}
            onPress={() => { close(); router.push('/settings'); }}
          >
            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
              Settings
            </Text>
          </Pressable>
        </Animated.View>
        <Animated.View style={menuItem1Style}>
          <Pressable
            style={[styles.fabMenuItem, { backgroundColor: colors.surface }]}
            onPress={() => { close(); router.push('/add'); }}
          >
            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
              Add Card
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* FAB */}
      <View style={[styles.fabWrap, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable
          style={[styles.fab, { backgroundColor: colors.accent }]}
          onPress={toggle}
          accessibilityLabel="Menu"
          accessibilityRole="button"
        >
          <Animated.Text
            style={[{ color: textOnColor(colors.accent), fontSize: 22 }, fabIconStyle]}
          >
            ☰
          </Animated.Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  stackWrap: {
    flex: 1,
    paddingHorizontal: 20,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    fontSize: 64,
    fontWeight: '200',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 90,
  },
  fabMenu: {
    position: 'absolute',
    right: 20,
    gap: 10,
    alignItems: 'flex-end',
    zIndex: 95,
  },
  fabMenuItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabWrap: {
    position: 'absolute',
    bottom: 0,
    right: 20,
    zIndex: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
