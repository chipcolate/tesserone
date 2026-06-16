import React from 'react';
import { StyleSheet, Platform, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { FidelityCard } from '../../types';
import { CardFlip } from './CardFlip';
import { resolveCardColor } from '../../services/logos';
import { isLightColor, useTheme } from '../../theme';
import {
  CARD_STACK,
  SPRING_SELECT,
  SPRING_REORDER,
  CardStackState,
  frontFaceOpacity,
  backFaceOpacity,
} from './useCardStack';

interface CardItemProps {
  card: FidelityCard;
  index: number;
  total: number;
  state: CardStackState;
  reorderMode: boolean;
  onReorder: (from: number, to: number) => void;
}

export const CardItem = React.memo(function CardItem({
  card,
  index,
  total,
  state,
  reorderMode,
  onReorder,
}: CardItemProps) {
  const { colors } = useTheme();

  const tapGesture = state.makeTapGesture(index);
  const longPressGesture = state.makeLongPressGesture(() => {
    router.push(`/card/${card.id}`);
  });
  const reorderGesture = state.makeReorderGesture(index, onReorder);

  // Normal: long-press (edit) > tap. Reorder: drag > nothing.
  const gesture = reorderMode
    ? reorderGesture
    : Gesture.Exclusive(longPressGesture, tapGesture);

  const effectiveFlip = useDerivedValue(() => {
    return state.selectedCardIndex.value === index ? state.flipProgress.value : 0;
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => {
    const selected = state.selectedCardIndex.value;
    const vh = state.viewportHeight.value;
    const isDragged = state.draggedIndex.value === index;

    // --- Dragged card follows finger ---
    if (isDragged) {
      return {
        transform: [
          { translateY: state.dragStartY.value + state.dragTranslateY.value },
          { scale: 1.05 },
          { rotate: '0deg' },
        ],
        height: CARD_STACK.CARD_HEIGHT,
        borderRadius: CARD_STACK.CARD_RADIUS,
        zIndex: 999,
      };
    }

    // --- Reorder mode: shift to make room for dragged card ---
    if (state.draggedIndex.value !== -1) {
      const dragIdx = state.draggedIndex.value;
      const dragCurrentY =
        state.dragStartY.value + state.dragTranslateY.value + state.scrollOffset.value;
      const dragCurrentSlot = Math.round(dragCurrentY / CARD_STACK.STACK_SPACING);
      const clampedSlot = Math.max(0, Math.min(total - 1, dragCurrentSlot));

      let adjustedIndex = index;
      if (index > dragIdx && index <= clampedSlot) {
        adjustedIndex = index - 1;
      } else if (index < dragIdx && index >= clampedSlot) {
        adjustedIndex = index + 1;
      }

      const targetY = adjustedIndex * CARD_STACK.STACK_SPACING - state.scrollOffset.value;
      return {
        transform: [
          { translateY: withSpring(targetY, SPRING_REORDER) },
          { scale: withSpring(1.02, SPRING_REORDER) },
        ],
        height: CARD_STACK.CARD_HEIGHT,
        borderRadius: CARD_STACK.CARD_RADIUS,
        zIndex: index,
      };
    }

    // --- Normal stack mode (armed lift when reorder is on) ---
    if (selected === -1) {
      const targetY = index * CARD_STACK.STACK_SPACING - state.scrollOffset.value;
      const stiff = { damping: 80, stiffness: 1200 };
      const armed = state.reorderMode.value === 1;
      return {
        transform: [
          { translateY: withSpring(targetY, stiff) },
          { scale: withSpring(armed ? 1.02 : 1, stiff) },
        ],
        height: withSpring(CARD_STACK.CARD_HEIGHT, stiff),
        borderRadius: CARD_STACK.CARD_RADIUS,
        zIndex: index,
      };
    }

    // --- Selected card ---
    if (selected === index) {
      const miniStackHeight = Math.min(
        (total - 1) * CARD_STACK.MINI_PEEK,
        vh * 0.2
      );
      const expandedHeight = vh - CARD_STACK.EXPANDED_TOP - miniStackHeight - 10;
      return {
        transform: [
          {
            translateY: withSpring(
              CARD_STACK.EXPANDED_TOP + state.dismissTranslateY.value,
              SPRING_SELECT
            ),
          },
          { rotate: '0deg' },
        ],
        height: withSpring(expandedHeight, SPRING_SELECT),
        borderRadius: CARD_STACK.CARD_RADIUS,
        zIndex: 1000,
      };
    }

    // --- Mini-stack ---
    const miniIndex = index < selected ? index : index - 1;
    const numMiniCards = total - 1;
    const miniStackBottom = vh - 10;
    const miniY = miniStackBottom - (numMiniCards - miniIndex) * CARD_STACK.MINI_PEEK;
    return {
      transform: [
        { translateY: withSpring(miniY, SPRING_SELECT) },
        { rotate: '0deg' },
      ],
      height: CARD_STACK.CARD_HEIGHT,
      borderRadius: CARD_STACK.CARD_RADIUS,
      zIndex: miniIndex,
    };
  }, [index, total]);

  const bg = resolveCardColor(card.color, card.logoSlug);
  const handleTint = isLightColor(bg) ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.55)';

  const handleFrontStyle = useAnimatedStyle(() => {
    const isSelected = state.selectedCardIndex.value === index;
    return {
      opacity: isSelected ? frontFaceOpacity(state.flipProgress.value) : 0,
      transform: [
        { perspective: 1000 },
        { rotateY: `${isSelected ? state.flipProgress.value : 0}rad` },
      ],
    };
  }, [index]);

  const handleBackStyle = useAnimatedStyle(() => {
    const isSelected = state.selectedCardIndex.value === index;
    return {
      opacity: isSelected ? backFaceOpacity(state.flipProgress.value) : 0,
      transform: [
        { perspective: 1000 },
        { rotateY: `${(isSelected ? state.flipProgress.value : 0) + Math.PI}rad` },
      ],
    };
  }, [index]);

  // Static "armed" cue for reorder mode — a crisp accent outline, no jiggle.
  const armedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(state.reorderMode.value === 1 ? 1 : 0, { duration: 150 }),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.item, animatedStyle]}>
        <CardFlip card={card} flipProgress={effectiveFlip} />
        <Animated.View style={[styles.handleWrap, handleFrontStyle]} pointerEvents="none">
          <View style={[styles.handle, { backgroundColor: handleTint }]} />
        </Animated.View>
        <Animated.View style={[styles.handleWrap, handleBackStyle]} pointerEvents="none">
          <View style={[styles.handle, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[styles.armed, { borderColor: colors.accent }, armedStyle]}
        />
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  handleWrap: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  armed: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: CARD_STACK.CARD_RADIUS,
  },
});
