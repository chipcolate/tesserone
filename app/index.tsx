import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  interpolate,
  runOnJS,
  Extrapolation,
} from 'react-native-reanimated';
import { useCardsStore, getSortedCards } from '../src/stores/cards';
import { useSettingsStore } from '../src/stores/settings';
import { useTheme, typography, textOnColor } from '../src/theme';
import { CardStack, useCardStack } from '../src/components/wallet/CardStack';
import { TutorialOverlay, type TargetRect } from '../src/components/tutorial/TutorialOverlay';
import { useActiveTutorialStep } from '../src/components/tutorial/useActiveTutorialStep';
import { useTutorialStore } from '../src/stores/tutorial';

const SPRING = { damping: 18, stiffness: 260 } as const;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { cards, reorderCard } = useCardsStore();
  const { sortMode } = useSettingsStore();
  const stackState = useCardStack();
  const [reorderMode, setReorderMode] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [selectedCardIdx, setSelectedCardIdx] = useState(-1);

  // Sync React state to shared value so gesture worklets can read it
  useEffect(() => {
    stackState.reorderMode.value = reorderMode ? 1 : 0;
  }, [reorderMode, stackState.reorderMode]);

  // Mirror selectedCardIndex shared value to React state for tutorial gating
  useAnimatedReaction(
    () => stackState.selectedCardIndex.value,
    (curr, prev) => {
      if (curr !== prev) runOnJS(setSelectedCardIdx)(curr);
    }
  );

  // 0 = closed, 1 = open
  const fabProgress = useSharedValue(0);

  const toggle = useCallback(() => {
    const opening = fabProgress.value < 0.5;
    fabProgress.value = withSpring(opening ? 1 : 0, SPRING);
    setFabOpen(opening);
  }, [fabProgress]);

  const close = useCallback(() => {
    fabProgress.value = withSpring(0, SPRING);
    setFabOpen(false);
  }, [fabProgress]);

  const cardsList = getSortedCards(cards, sortMode);

  const toggleReorder = useCallback(() => {
    close();
    setReorderMode((v) => !v);
  }, [close]);

  const handleReorder = useCallback(
    (from: number, to: number) => {
      const card = cardsList[from];
      if (card) reorderCard(card.id, to);
    },
    [cardsList, reorderCard]
  );

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: fabProgress.value,
    pointerEvents: fabProgress.value > 0.01 ? 'auto' as const : 'none' as const,
  }));

  const fabIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(fabProgress.value, [0, 1], [0, 90])}deg` }],
  }));

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

  const menuItem3Style = useAnimatedStyle(() => {
    const visible = fabProgress.value > 0.2;
    return {
      opacity: interpolate(fabProgress.value, [0, 0.2, 0.6], [0, 0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(fabProgress.value, [0, 1], [70, 0], Extrapolation.CLAMP) },
        { scale: interpolate(fabProgress.value, [0, 0.2, 0.6], [0.8, 0.8, 1], Extrapolation.CLAMP) },
      ],
      pointerEvents: visible ? 'auto' as const : 'none' as const,
    };
  });

  const fabRef = useRef<View>(null);
  const reorderItemRef = useRef<View>(null);
  const [fabRect, setFabRect] = useState<TargetRect | null>(null);
  const [reorderItemRect, setReorderItemRect] = useState<TargetRect | null>(null);
  const markSeen = useTutorialStore((s) => s.markSeen);

  const measureFab = useCallback(() => {
    fabRef.current?.measureInWindow((x, y, width, height) => {
      setFabRect({ x, y, width, height });
    });
  }, []);

  // Re-measure the Reorder menu item once the FAB animation settles
  useEffect(() => {
    if (!fabOpen) return;
    const t = setTimeout(() => {
      reorderItemRef.current?.measureInWindow((x, y, width, height) => {
        setReorderItemRect({ x, y, width, height });
      });
    }, 280);
    return () => clearTimeout(t);
  }, [fabOpen]);

  const activeStep = useActiveTutorialStep({
    cardCount: cardsList.length,
    selectedCardIdx,
    fabOpen,
    reorderMode,
  });

  const targetRect: TargetRect | null =
    activeStep?.target === 'fab'
      ? fabRect
      : activeStep?.target === 'reorderItem'
      ? reorderItemRect
      : null;

  // FAB cutout is circular; menu items are pill-shaped
  const cutoutRadius = activeStep?.target === 'fab' ? 28 : 14;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[typography.title, { color: colors.text }]}>Tesserone</Text>
      </View>

      <View style={styles.stackWrap}>
        {cardsList.length === 0 ? (
          <Pressable style={styles.empty} onPress={() => router.push('/add')}>
            <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>+</Text>
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
              Add your first card
            </Text>
          </Pressable>
        ) : (
          <CardStack cards={cardsList} state={stackState} reorderMode={reorderMode} onReorder={handleReorder} />
        )}
      </View>

      <Animated.View style={[styles.scrim, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <View style={[styles.fabMenu, { bottom: insets.bottom + 80 }]} pointerEvents="box-none">
        <Animated.View style={menuItem3Style}>
          <Pressable
            style={[styles.fabMenuItem, { backgroundColor: colors.surface }]}
            onPress={() => { close(); router.push('/settings'); }}
          >
            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
              Settings
            </Text>
          </Pressable>
        </Animated.View>
        <Animated.View style={menuItem2Style}>
          <Pressable
            ref={reorderItemRef}
            style={[styles.fabMenuItem, { backgroundColor: colors.surface }]}
            onPress={toggleReorder}
          >
            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
              {reorderMode ? 'Done' : 'Reorder'}
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

      <View style={[styles.fabWrap, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable
          ref={fabRef}
          onLayout={measureFab}
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

      <TutorialOverlay
        visible={!!activeStep}
        title={activeStep?.title}
        message={activeStep?.message ?? ''}
        targetRect={targetRect}
        cutoutRadius={cutoutRadius}
        onDismiss={() => {
          if (activeStep) markSeen(activeStep.id);
        }}
      />
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
