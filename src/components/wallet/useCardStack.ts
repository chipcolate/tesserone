import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useSharedValue, withDecay, withSpring, withTiming, runOnJS, interpolate, Easing } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import * as Brightness from 'expo-brightness';
import { CARD_RADIUS } from '../../theme/geometry';

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

function triggerLightHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export const CARD_STACK = {
  STACK_SPACING: 170,
  CARD_HEIGHT: 280,
  CARD_RADIUS,
  MINI_PEEK: 45,
  EXPANDED_TOP: 20,
} as const;

// "Raw aesthetic" motion: critically/over-damped springs — they arrive fast and
// stop dead, no overshoot or bounce. Reads engineered rather than springy.
export const SPRING_SELECT = { damping: 33, stiffness: 260 } as const;
const SPRING_DISMISS = { damping: 34, stiffness: 280 } as const;
const SPRING_BOUNCE = { damping: 42, stiffness: 420 } as const;
export const SPRING_REORDER = { damping: 40, stiffness: 340 } as const;

// The flip is a discrete, mechanical hinge — a timing curve (decisive, no spring
// settle) reads far less "jelly" than a spring. Snappy-in, hard decelerate.
const FLIP_TIMING = { duration: 300, easing: Easing.out(Easing.cubic) } as const;

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 500;
// Tighter overscroll — less organic squish, more rigid resistance.
const RUBBER_BAND_FACTOR = 0.18;

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
  // iOS: UIScreen.main.brightness is the device brightness — we save and restore it.
  // Android: setBrightnessAsync only installs a per-window override; releasing it
  // via restoreSystemBrightnessAsync hands control back to adaptive brightness,
  // which is what users expect (and avoids a stale value from getBrightnessAsync,
  // which under adaptive mode reports the user's adj-slider offset rather than the
  // actual screen brightness).
  const savedBrightnessRef = useRef<number | null>(null);
  const overrideActiveRef = useRef(false);

  const maxBrightness = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        savedBrightnessRef.current = await Brightness.getBrightnessAsync();
      }
      await Brightness.setBrightnessAsync(1);
      overrideActiveRef.current = true;
    } catch {
      savedBrightnessRef.current = null;
    }
  }, []);

  const restoreBrightness = useCallback(async () => {
    if (!overrideActiveRef.current) return;
    overrideActiveRef.current = false;
    try {
      if (Platform.OS === 'android') {
        await Brightness.restoreSystemBrightnessAsync();
      } else {
        const saved = savedBrightnessRef.current;
        savedBrightnessRef.current = null;
        if (saved !== null) {
          await Brightness.setBrightnessAsync(saved);
        }
      }
    } catch {
      // next maxBrightness call will re-apply the override
    }
  }, []);

  const scrollOffset = useSharedValue(0);
  const savedOffset = useSharedValue(0);
  const maxScroll = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const selectedCardIndex = useSharedValue(-1);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        restoreBrightness();
      } else if (next === 'active' && selectedCardIndex.value !== -1) {
        maxBrightness();
      }
    });
    return () => sub.remove();
  }, [maxBrightness, restoreBrightness, selectedCardIndex]);
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
          flipProgress.value = withTiming(0, FLIP_TIMING);
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
        flipProgress.value = withTiming(Math.PI, FLIP_TIMING);
        runOnJS(triggerHaptic)();
        runOnJS(maxBrightness)();
      } else if (selectedCardIndex.value === index) {
        selectedCardIndex.value = -1;
        flipProgress.value = withTiming(0, FLIP_TIMING);
        runOnJS(triggerHaptic)();
        runOnJS(restoreBrightness)();
      }
    });

  // Imperatively expand + flip a card to its barcode, mirroring the tap gesture.
  // Used by the home screen to honor the `tesserone://open/<id>` widget deep link.
  const selectCardByIndex = useCallback(
    (index: number) => {
      if (index < 0) return;
      // Idempotent: re-asserting the same selection only refreshes the flip +
      // brightness (no extra haptic), so callers can safely call this again to
      // defeat a first-launch/resume layout race without a double buzz.
      const already = selectedCardIndex.value === index;
      selectedCardIndex.value = index;
      flipProgress.value = withTiming(Math.PI, FLIP_TIMING);
      // Only buzz + boost brightness on the actual transition; re-asserts (used
      // to defeat resume/layout races) just refresh the shared values.
      if (!already) {
        triggerHaptic();
        maxBrightness();
      }
    },
    [selectedCardIndex, flipProgress, maxBrightness]
  );

  const makeLongPressGesture = (onEdit: () => void) =>
    Gesture.LongPress()
      .minDuration(400)
      .onStart(() => {
        if (reorderMode.value === 1) return; // drag handles reorder
        if (selectedCardIndex.value === -1) return;
        runOnJS(triggerHaptic)();
        selectedCardIndex.value = -1;
        flipProgress.value = withTiming(0, FLIP_TIMING);
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
    selectCardByIndex,
  };
}

export type CardStackState = ReturnType<typeof useCardStack>;
