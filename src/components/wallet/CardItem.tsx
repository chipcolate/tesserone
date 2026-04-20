import React, { useEffect } from 'react';
import { StyleSheet, Platform, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { FidelityCard } from '../../types';
import { CardFlip } from './CardFlip';
import { getBrand } from '../../services/logos';
import { isLightColor } from '../../theme';
import {
  CARD_STACK,
  SPRING_SELECT,
  SPRING_REORDER,
  CardStackState,
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

  // Wobble animation for reorder mode
  const wobble = useSharedValue(0);
  useEffect(() => {
    if (reorderMode) {
      // Random-ish phase offset per card so they don't sync
      const delay = (index % 3) * 50;
      setTimeout(() => {
        wobble.value = withRepeat(
          withSequence(
            withTiming(-2, { duration: 100, easing: Easing.inOut(Easing.ease) }),
            withTiming(2, { duration: 200, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 100, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          true
        );
      }, delay);
    } else {
      cancelAnimation(wobble);
      wobble.value = withTiming(0, { duration: 150 });
    }
  }, [reorderMode]);

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
          { rotate: `${wobble.value}deg` },
        ],
        height: CARD_STACK.CARD_HEIGHT,
        borderRadius: CARD_STACK.CARD_RADIUS,
        zIndex: index,
      };
    }

    // --- Normal stack mode (including wobble when reorder is on) ---
    if (selected === -1) {
      const targetY = index * CARD_STACK.STACK_SPACING - state.scrollOffset.value;
      const stiff = { damping: 80, stiffness: 1200 };
      return {
        transform: [
          { translateY: withSpring(targetY, stiff) },
          { rotate: `${wobble.value}deg` },
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

  const bg = card.color || getBrand(card.logoSlug || '')?.primaryColor || '#333333';
  const handleTint = isLightColor(bg) ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.55)';

  const handleFrontStyle = useAnimatedStyle(() => {
    const isSelected = state.selectedCardIndex.value === index;
    const flipOpacity = interpolate(
      state.flipProgress.value,
      [0, Math.PI / 2 - 0.01, Math.PI / 2, Math.PI],
      [1, 1, 0, 0]
    );
    return {
      opacity: isSelected ? flipOpacity : 0,
      transform: [
        { perspective: 1000 },
        { rotateY: `${isSelected ? state.flipProgress.value : 0}rad` },
      ],
    };
  }, [index]);

  const handleBackStyle = useAnimatedStyle(() => {
    const isSelected = state.selectedCardIndex.value === index;
    const flipOpacity = interpolate(
      state.flipProgress.value,
      [0, Math.PI / 2, Math.PI / 2 + 0.01, Math.PI],
      [0, 0, 1, 1]
    );
    return {
      opacity: isSelected ? flipOpacity : 0,
      transform: [
        { perspective: 1000 },
        { rotateY: `${(isSelected ? state.flipProgress.value : 0) + Math.PI}rad` },
      ],
    };
  }, [index]);

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
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
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
});
