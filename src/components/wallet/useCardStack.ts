import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import {
  useSharedValue,
  useAnimatedReaction,
  withDecay,
  withSpring,
  withTiming,
  cancelAnimation,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import * as Brightness from 'expo-brightness';
import type { AnimationsLevel } from '../../types';

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

// Spring configs per animations level. Stiffer = settles faster = feels snappier.
export const SPRING_SELECT = { damping: 25, stiffness: 180 } as const;
export const SPRING_SELECT_REDUCED = { damping: 30, stiffness: 380 } as const;
const SPRING_DISMISS = { damping: 35, stiffness: 200 } as const;
const SPRING_DISMISS_REDUCED = { damping: 35, stiffness: 420 } as const;
const SPRING_BOUNCE = { damping: 20, stiffness: 300 } as const;
const SPRING_FLIP = { damping: 26, stiffness: 300 } as const;
const SPRING_FLIP_REDUCED = { damping: 30, stiffness: 600 } as const;
export const SPRING_REORDER = { damping: 20, stiffness: 250 } as const;

// Approximate spring settle time in ms — used to keep `transitionPulse` high
// until the spring is essentially done, after which we resume raw 1:1 tracking.
const TRANSITION_MS_NORMAL = 450;
const TRANSITION_MS_REDUCED = 240;

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

// Level encoded as a number for shared-value use: 0=none, 1=reduced, 2=normal
export function animLevelToNumber(level: AnimationsLevel): number {
  return level === 'none' ? 0 : level === 'reduced' ? 1 : 2;
}

export function useCardStack(animationsLevel: AnimationsLevel) {
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

  // Mirrors animationsLevel for worklet access.
  const animLevel = useSharedValue(animLevelToNumber(animationsLevel));
  useEffect(() => {
    animLevel.value = animLevelToNumber(animationsLevel);
  }, [animationsLevel, animLevel]);

  // Pulses to 1 the moment a state transition starts and decays to 0 once
  // the spring should be done. CardItem reads this to decide between
  // springed translateY (during the pulse) and raw translateY (during pure
  // scroll), avoiding the per-frame re-target lag that produces the
  // "throttled finger" feel.
  const transitionPulse = useSharedValue(0);

  useAnimatedReaction(
    () => selectedCardIndex.value,
    (curr, prev) => {
      if (prev === null || curr === prev) return;
      if (animLevel.value === 0) {
        // No animations: leave pulse at 0 so CardItem snaps with no spring.
        return;
      }
      const ms = animLevel.value === 1 ? TRANSITION_MS_REDUCED : TRANSITION_MS_NORMAL;
      cancelAnimation(transitionPulse);
      transitionPulse.value = 1;
      transitionPulse.value = withTiming(0, { duration: ms });
    }
  );

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
    // Small activation threshold so the velocity tracker starts sampling
    // immediately — a larger window swallows the early high-velocity samples
    // and onEnd sees a low velocity, producing the "no inertia" feel.
    .activeOffsetY([-2, 2])
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
          scrollOffset.value = animLevel.value === 0 ? 0 : withSpring(0, SPRING_BOUNCE);
          if (animLevel.value !== 0) runOnJS(triggerLightHaptic)();
        } else if (scrollOffset.value > max) {
          scrollOffset.value = animLevel.value === 0 ? max : withSpring(max, SPRING_BOUNCE);
          if (animLevel.value !== 0) runOnJS(triggerLightHaptic)();
        } else if (animLevel.value === 0) {
          // No decay glide — leave the offset where the finger left it.
        } else {
          scrollOffset.value = withDecay({
            velocity: -event.velocityY,
            // Mild amplification compensates for gesture-handler under-reporting
            // velocity on fast flicks (more visible on Android).
            velocityFactor: 1.2,
            clamp: [0, max],
            deceleration: 0.998,
          });
        }
      } else {
        const dismissSpring =
          animLevel.value === 1 ? SPRING_DISMISS_REDUCED : SPRING_DISMISS;
        const flipSpring =
          animLevel.value === 1 ? SPRING_FLIP_REDUCED : SPRING_FLIP;
        if (
          dismissTranslateY.value < -DISMISS_DISTANCE ||
          event.velocityY < -DISMISS_VELOCITY
        ) {
          selectedCardIndex.value = -1;
          if (animLevel.value === 0) {
            dismissTranslateY.value = 0;
            flipProgress.value = 0;
          } else {
            dismissTranslateY.value = withSpring(0, dismissSpring);
            flipProgress.value = withSpring(0, flipSpring);
          }
          runOnJS(restoreBrightness)();
        } else {
          const selectSpring =
            animLevel.value === 1 ? SPRING_SELECT_REDUCED : SPRING_SELECT;
          dismissTranslateY.value =
            animLevel.value === 0 ? 0 : withSpring(0, selectSpring);
        }
      }
    });

  const makeTapGesture = (index: number) =>
    Gesture.Tap().onEnd(() => {
      if (reorderMode.value === 1) return;
      const flipSpring =
        animLevel.value === 1 ? SPRING_FLIP_REDUCED : SPRING_FLIP;
      if (selectedCardIndex.value === -1) {
        selectedCardIndex.value = index;
        flipProgress.value =
          animLevel.value === 0 ? Math.PI : withSpring(Math.PI, flipSpring);
        runOnJS(triggerHaptic)();
        runOnJS(maxBrightness)();
      } else if (selectedCardIndex.value === index) {
        selectedCardIndex.value = -1;
        flipProgress.value =
          animLevel.value === 0 ? 0 : withSpring(0, flipSpring);
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
        const flipSpring =
          animLevel.value === 1 ? SPRING_FLIP_REDUCED : SPRING_FLIP;
        runOnJS(triggerHaptic)();
        selectedCardIndex.value = -1;
        flipProgress.value =
          animLevel.value === 0 ? 0 : withSpring(0, flipSpring);
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
    animLevel,
    transitionPulse,
    panGesture,
    makeTapGesture,
    makeLongPressGesture,
    makeReorderGesture,
  };
}

export type CardStackState = ReturnType<typeof useCardStack>;
