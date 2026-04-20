import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { useTheme, typography, textOnColor } from '../../theme';

export type TargetRect = { x: number; y: number; width: number; height: number };

type Props = {
  visible: boolean;
  message: string;
  title?: string;
  targetRect?: TargetRect | null;
  cutoutPadding?: number;
  cutoutRadius?: number;
  arrow?: 'top' | 'bottom' | 'auto' | 'none';
  onDismiss: () => void;
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FADE_MS = 220;
const BACKDROP = 'rgba(0,0,0,0.72)';

export function TutorialOverlay({
  visible,
  title,
  message,
  targetRect,
  cutoutPadding = 8,
  cutoutRadius = 16,
  arrow = 'auto',
  onDismiss,
}: Props) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      opacity.value = withTiming(1, { duration: FADE_MS, easing: Easing.out(Easing.quad) });
    } else {
      opacity.value = withTiming(0, { duration: FADE_MS, easing: Easing.out(Easing.quad) });
      const t = setTimeout(() => setMounted(false), FADE_MS + 30);
      return () => clearTimeout(t);
    }
  }, [visible, opacity]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!mounted) return null;

  const cutout = targetRect
    ? {
        x: Math.max(0, targetRect.x - cutoutPadding),
        y: Math.max(0, targetRect.y - cutoutPadding),
        width: targetRect.width + cutoutPadding * 2,
        height: targetRect.height + cutoutPadding * 2,
      }
    : null;

  // Decide where to place the callout relative to the cutout
  let calloutTop: number | undefined;
  let calloutBottom: number | undefined;

  if (cutout) {
    const above = cutout.y;
    const below = SCREEN_H - (cutout.y + cutout.height);
    const placeBelow = arrow === 'top' || (arrow === 'auto' && below >= above);
    if (placeBelow) {
      calloutTop = cutout.y + cutout.height + 18;
    } else {
      calloutBottom = SCREEN_H - cutout.y + 18;
    }
  } else {
    calloutTop = SCREEN_H * 0.42;
  }

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, containerStyle]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Backdrop with optional cutout — tap anywhere to dismiss */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss}>
        <Svg
          width={SCREEN_W}
          height={SCREEN_H}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            <Mask id="cutoutMask" x="0" y="0" width={SCREEN_W} height={SCREEN_H}>
              <Rect x={0} y={0} width={SCREEN_W} height={SCREEN_H} fill="white" />
              {cutout && (
                <Rect
                  x={cutout.x}
                  y={cutout.y}
                  width={cutout.width}
                  height={cutout.height}
                  rx={cutoutRadius}
                  ry={cutoutRadius}
                  fill="black"
                />
              )}
            </Mask>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={SCREEN_W}
            height={SCREEN_H}
            fill={BACKDROP}
            mask="url(#cutoutMask)"
          />
        </Svg>
      </Pressable>

      {/* Callout bubble */}
      <View
        style={[
          styles.callout,
          { backgroundColor: colors.surface },
          calloutTop !== undefined && { top: calloutTop },
          calloutBottom !== undefined && { bottom: calloutBottom },
        ]}
      >
        {title && (
          <Text style={[typography.body, styles.title, { color: colors.text }]}>
            {title}
          </Text>
        )}
        <Text style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
          {message}
        </Text>
        <Pressable
          onPress={onDismiss}
          style={[styles.button, { backgroundColor: colors.accent }]}
          accessibilityRole="button"
          accessibilityLabel="Dismiss tutorial tip"
        >
          <Text style={[typography.body, styles.buttonText, { color: textOnColor(colors.accent) }]}>
            Got it
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 200 },
  callout: {
    position: 'absolute',
    left: 24,
    right: 24,
    padding: 18,
    borderRadius: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
  },
  title: {
    fontWeight: '700',
    marginBottom: 2,
  },
  button: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: {
    fontWeight: '700',
  },
});
