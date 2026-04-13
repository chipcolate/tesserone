import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { FidelityCard } from '../../types';
import { CardFlip } from './CardFlip';
import {
  CARD_STACK,
  SPRING_SELECT,
  SPRING_DISMISS,
  CardStackState,
} from './useCardStack';

interface CardItemProps {
  card: FidelityCard;
  index: number;
  total: number;
  state: CardStackState;
}

/**
 * A single card in the stack.
 *
 * Stack mode: shows CardFace, tap to select.
 * Selected mode: shows CardFlip (tappable to flip front/back), pan to dismiss.
 */
export const CardItem = React.memo(function CardItem({
  card,
  index,
  total,
  state,
}: CardItemProps) {
  const tapGesture = state.makeTapGesture(index);

  // Only the selected card follows flipProgress; others stay at 0 (front face).
  const effectiveFlip = useDerivedValue(() => {
    return state.selectedCardIndex.value === index ? state.flipProgress.value : 0;
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => {
    const selected = state.selectedCardIndex.value;
    const vh = state.viewportHeight.value;

    if (selected === -1) {
      // --- Stack mode ---
      // Stiff spring: imperceptible during scroll (target moves a few px
      // per frame) but creates a visible shrink animation when returning
      // from the expanded state (target jumps hundreds of px).
      const targetY = index * CARD_STACK.STACK_SPACING - state.scrollOffset.value;
      const stiff = { damping: 80, stiffness: 1200 };
      return {
        transform: [{ translateY: withSpring(targetY, stiff) }],
        height: withSpring(CARD_STACK.CARD_HEIGHT, stiff),
        borderRadius: CARD_STACK.CARD_RADIUS,
        zIndex: index,
      };
    }

    if (selected === index) {
      // --- Selected ---
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
      transform: [{ translateY: withSpring(miniY, SPRING_SELECT) }],
      height: CARD_STACK.CARD_HEIGHT,
      borderRadius: CARD_STACK.CARD_RADIUS,
      zIndex: miniIndex,
    };
  }, [index, total]);

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={[styles.item, animatedStyle]}>
        <CardFlip card={card} flipProgress={effectiveFlip} />
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
});
