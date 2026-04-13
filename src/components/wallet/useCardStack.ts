import { useSharedValue, withDecay, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export const CARD_STACK = {
  STACK_SPACING: 170,
  CARD_HEIGHT: 280,
  CARD_RADIUS: 16,
  MINI_PEEK: 45,
  EXPANDED_TOP: 20,
} as const;

export const SPRING_SELECT = { damping: 25, stiffness: 180 } as const;
export const SPRING_DISMISS = { damping: 35, stiffness: 200 } as const;
export const SPRING_BOUNCE = { damping: 20, stiffness: 300 } as const;
export const SPRING_FLIP = { damping: 26, stiffness: 300 } as const;

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 500;
const RUBBER_BAND_FACTOR = 0.35;

function rubberBand(offset: number, limit: number, factor: number): number {
  'worklet';
  return limit + (offset - limit) * factor;
}

export function stackContentHeight(numCards: number): number {
  if (numCards === 0) return 0;
  return (numCards - 1) * CARD_STACK.STACK_SPACING + CARD_STACK.CARD_HEIGHT;
}

export function useCardStack() {
  const scrollOffset = useSharedValue(0);
  const savedOffset = useSharedValue(0);
  const maxScroll = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const selectedCardIndex = useSharedValue(-1);
  const dismissTranslateY = useSharedValue(0);
  const savedDismissY = useSharedValue(0);
  /** 0 = front, Math.PI = back */
  const flipProgress = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onStart(() => {
      if (selectedCardIndex.value === -1) {
        savedOffset.value = scrollOffset.value;
      } else {
        savedDismissY.value = dismissTranslateY.value;
      }
    })
    .onUpdate((event) => {
      if (selectedCardIndex.value === -1) {
        const raw = savedOffset.value - event.translationY;
        const max = maxScroll.value;
        if (raw < 0) {
          scrollOffset.value = rubberBand(raw, 0, RUBBER_BAND_FACTOR);
        } else if (raw > max) {
          scrollOffset.value = rubberBand(raw, max, RUBBER_BAND_FACTOR);
        } else {
          scrollOffset.value = raw;
        }
      } else {
        dismissTranslateY.value = Math.min(
          0,
          savedDismissY.value + event.translationY
        );
      }
    })
    .onEnd((event) => {
      if (selectedCardIndex.value === -1) {
        const max = maxScroll.value;
        if (scrollOffset.value < 0) {
          scrollOffset.value = withSpring(0, SPRING_BOUNCE);
        } else if (scrollOffset.value > max) {
          scrollOffset.value = withSpring(max, SPRING_BOUNCE);
        } else {
          scrollOffset.value = withDecay({
            velocity: -event.velocityY,
            clamp: [0, max],
            deceleration: 0.998,
          });
        }
      } else {
        if (
          dismissTranslateY.value < -DISMISS_DISTANCE ||
          event.velocityY < -DISMISS_VELOCITY
        ) {
          // Dismiss: deselect and reset flip to front
          selectedCardIndex.value = -1;
          dismissTranslateY.value = withSpring(0, SPRING_DISMISS);
          flipProgress.value = withSpring(0, SPRING_FLIP);
        } else {
          dismissTranslateY.value = withSpring(0, SPRING_SELECT);
        }
      }
    });

  // Single tap per card: selects if in stack mode, flips if this card
  // is selected, does nothing if another card is selected (mini-stack).
  const makeTapGesture = (index: number) =>
    Gesture.Tap().onEnd(() => {
      if (selectedCardIndex.value === -1) {
        // Stack mode → select this card
        selectedCardIndex.value = index;
        runOnJS(triggerHaptic)();
      } else if (selectedCardIndex.value === index) {
        // This card is expanded → flip
        const target = flipProgress.value < Math.PI / 2 ? Math.PI : 0;
        flipProgress.value = withSpring(target, SPRING_FLIP);
        runOnJS(triggerHaptic)();
      }
    });

  return {
    scrollOffset,
    maxScroll,
    viewportHeight,
    selectedCardIndex,
    dismissTranslateY,
    flipProgress,
    panGesture,
    makeTapGesture,
  };
}

export type CardStackState = ReturnType<typeof useCardStack>;
