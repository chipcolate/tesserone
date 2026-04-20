import { useCallback, useRef } from 'react';
import { useSharedValue, withDecay, withSpring, runOnJS, interpolate } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import * as Brightness from 'expo-brightness';

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

function triggerLightHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export const CARD_STACK = {
  STACK_SPACING: 170,
  CARD_HEIGHT: 280,
  CARD_RADIUS: 16,
  MINI_PEEK: 45,
  EXPANDED_TOP: 20,
} as const;

export const SPRING_SELECT = { damping: 25, stiffness: 180 } as const;
const SPRING_DISMISS = { damping: 35, stiffness: 200 } as const;
const SPRING_BOUNCE = { damping: 20, stiffness: 300 } as const;
const SPRING_FLIP = { damping: 26, stiffness: 300 } as const;
export const SPRING_REORDER = { damping: 20, stiffness: 250 } as const;

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 500;
const RUBBER_BAND_FACTOR = 0.35;

function rubberBand(offset: number, limit: number, factor: number): number {
  'worklet';
  return limit + (offset - limit) * factor;
}

/**
 * Opacity for the front face of a flip (1 at 0, 0 at PI).
 * Uses a hard 90° cutoff so the front disappears as the back appears.
 */
export function frontFaceOpacity(flipProgress: number): number {
  'worklet';
  return interpolate(flipProgress, [0, Math.PI / 2 - 0.01, Math.PI / 2, Math.PI], [1, 1, 0, 0]);
}

/**
 * Opacity for the back face of a flip (0 at 0, 1 at PI).
 * Mirror of frontFaceOpacity.
 */
export function backFaceOpacity(flipProgress: number): number {
  'worklet';
  return interpolate(flipProgress, [0, Math.PI / 2, Math.PI / 2 + 0.01, Math.PI], [0, 0, 1, 1]);
}

export function stackContentHeight(numCards: number): number {
  if (numCards === 0) return 0;
  return (numCards - 1) * CARD_STACK.STACK_SPACING + CARD_STACK.CARD_HEIGHT;
}

export function useCardStack() {
  const savedBrightnessRef = useRef<number | null>(null);

  const maxBrightness = useCallback(async () => {
    try {
      savedBrightnessRef.current = await Brightness.getBrightnessAsync();
      await Brightness.setBrightnessAsync(1);
    } catch {
      savedBrightnessRef.current = null;
    }
  }, []);

  const restoreBrightness = useCallback(async () => {
    const saved = savedBrightnessRef.current;
    if (saved === null) return;
    savedBrightnessRef.current = null;
    try {
      await Brightness.setBrightnessAsync(saved);
    } catch {
      // already cleared; next maxBrightness call will re-capture
    }
  }, []);

  const scrollOffset = useSharedValue(0);
  const savedOffset = useSharedValue(0);
  const maxScroll = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const selectedCardIndex = useSharedValue(-1);
  const dismissTranslateY = useSharedValue(0);
  const savedDismissY = useSharedValue(0);
  const flipProgress = useSharedValue(0);

  const reorderMode = useSharedValue(0); // 0 = off, 1 = on
  const draggedIndex = useSharedValue(-1);
  const dragTranslateY = useSharedValue(0);
  const dragStartY = useSharedValue(0);

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
          runOnJS(triggerLightHaptic)();
        } else if (scrollOffset.value > max) {
          scrollOffset.value = withSpring(max, SPRING_BOUNCE);
          runOnJS(triggerLightHaptic)();
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
          selectedCardIndex.value = -1;
          dismissTranslateY.value = withSpring(0, SPRING_DISMISS);
          flipProgress.value = withSpring(0, SPRING_FLIP);
          runOnJS(restoreBrightness)();
        } else {
          dismissTranslateY.value = withSpring(0, SPRING_SELECT);
        }
      }
    });

  const makeTapGesture = (index: number) =>
    Gesture.Tap().onEnd(() => {
      if (reorderMode.value === 1) return;
      if (selectedCardIndex.value === -1) {
        selectedCardIndex.value = index;
        flipProgress.value = withSpring(Math.PI, SPRING_FLIP);
        runOnJS(triggerHaptic)();
        runOnJS(maxBrightness)();
      } else if (selectedCardIndex.value === index) {
        selectedCardIndex.value = -1;
        flipProgress.value = withSpring(0, SPRING_FLIP);
        runOnJS(triggerHaptic)();
        runOnJS(restoreBrightness)();
      }
    });

  const makeLongPressGesture = (onEdit: () => void) =>
    Gesture.LongPress()
      .minDuration(400)
      .onStart(() => {
        if (reorderMode.value === 1) return; // drag handles reorder
        if (selectedCardIndex.value === -1) return;
        runOnJS(triggerHaptic)();
        selectedCardIndex.value = -1;
        flipProgress.value = withSpring(0, SPRING_FLIP);
        runOnJS(restoreBrightness)();
        runOnJS(onEdit)();
      });

  const makeReorderGesture = (index: number, onReorder: (from: number, to: number) => void) =>
    Gesture.Pan()
      .activateAfterLongPress(300)
      .onStart(() => {
        if (reorderMode.value !== 1) return;
        draggedIndex.value = index;
        dragTranslateY.value = 0;
        dragStartY.value = index * CARD_STACK.STACK_SPACING - scrollOffset.value;
        runOnJS(triggerHaptic)();
      })
      .onUpdate((event) => {
        if (draggedIndex.value !== index) return;
        dragTranslateY.value = event.translationY;
      })
      .onEnd(() => {
        if (draggedIndex.value !== index) return;
        const currentY = dragStartY.value + dragTranslateY.value;
        const targetIndex = Math.round(
          Math.max(0, currentY + scrollOffset.value) / CARD_STACK.STACK_SPACING
        );
        draggedIndex.value = -1;
        dragTranslateY.value = 0;
        if (targetIndex !== index) {
          runOnJS(onReorder)(index, targetIndex);
          runOnJS(triggerLightHaptic)();
        }
      });

  return {
    scrollOffset,
    maxScroll,
    viewportHeight,
    selectedCardIndex,
    dismissTranslateY,
    flipProgress,
    reorderMode,
    draggedIndex,
    dragTranslateY,
    dragStartY,
    panGesture,
    makeTapGesture,
    makeLongPressGesture,
    makeReorderGesture,
  };
}

export type CardStackState = ReturnType<typeof useCardStack>;
