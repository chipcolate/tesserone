import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme, typography } from '../../theme';
import { CHROME_RADIUS } from '../../theme/geometry';
import { mono } from '../../theme/fonts';
import { Button } from '../ui/Button';

export type TargetRect = { x: number; y: number; width: number; height: number };

type Props = {
  visible: boolean;
  message: string;
  title?: string;
  targetRect?: TargetRect | null;
  cutoutPadding?: number;
  cutoutRadius?: number;
  arrow?: 'top' | 'bottom' | 'auto' | 'none';
  stepIndex?: number;
  stepTotal?: number;
  onDismiss: () => void;
  onSkip?: () => void;
};

const FADE_MS = 220;
const BACKDROP = 'rgba(0,0,0,0.6)';

type FrozenContent = {
  title?: string;
  message: string;
  targetRect?: TargetRect | null;
  cutoutPadding: number;
  cutoutRadius: number;
  arrow: 'top' | 'bottom' | 'auto' | 'none';
};

export function TutorialOverlay({
  visible,
  title,
  message,
  targetRect,
  cutoutPadding = 8,
  cutoutRadius = 16,
  arrow = 'auto',
  stepIndex,
  stepTotal,
  onDismiss,
  onSkip,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const opacity = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);
  // Snapshot content while the tip is visible so the fade-out keeps rendering
  // the tip the user just dismissed rather than flashing the next (or empty) one.
  const [content, setContent] = useState<FrozenContent>({
    title,
    message,
    targetRect,
    cutoutPadding,
    cutoutRadius,
    arrow,
  });

  useEffect(() => {
    if (visible) {
      setContent({ title, message, targetRect, cutoutPadding, cutoutRadius, arrow });
      setMounted(true);
      opacity.value = withTiming(1, { duration: FADE_MS, easing: Easing.out(Easing.quad) });
    } else {
      opacity.value = withTiming(0, { duration: FADE_MS, easing: Easing.out(Easing.quad) });
      const t = setTimeout(() => setMounted(false), FADE_MS + 30);
      return () => clearTimeout(t);
    }
  }, [visible, title, message, targetRect, cutoutPadding, cutoutRadius, arrow, opacity]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!mounted) return null;

  const cutout = content.targetRect
    ? {
        x: Math.max(0, content.targetRect.x - content.cutoutPadding),
        y: Math.max(0, content.targetRect.y - content.cutoutPadding),
        width: content.targetRect.width + content.cutoutPadding * 2,
        height: content.targetRect.height + content.cutoutPadding * 2,
      }
    : null;

  let calloutTop: number | undefined;
  let calloutBottom: number | undefined;

  if (cutout) {
    const above = cutout.y;
    const below = SCREEN_H - (cutout.y + cutout.height);
    const placeBelow = content.arrow === 'top' || (content.arrow === 'auto' && below >= above);
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
                  rx={content.cutoutRadius}
                  ry={content.cutoutRadius}
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

      <View
        style={[
          styles.callout,
          { backgroundColor: colors.surface, borderColor: colors.border },
          calloutTop !== undefined && { top: calloutTop },
          calloutBottom !== undefined && { bottom: calloutBottom },
        ]}
      >
        <View style={styles.calloutHeader}>
          {stepIndex !== undefined && stepTotal !== undefined ? (
            <Text style={[styles.stepIndicator, { color: colors.textSecondary }]}>
              {t('tutorial.stepIndicator', {
                current: stepIndex + 1,
                total: stepTotal,
                defaultValue: `STEP ${stepIndex + 1} / ${stepTotal}`,
              })}
            </Text>
          ) : (
            <View />
          )}
          {onSkip ? (
            <Pressable onPress={onSkip} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.skip, { color: colors.textSecondary }]}>
                {t('tutorial.skip', { defaultValue: 'SKIP' })}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {content.title && (
          <Text style={[typography.body, styles.title, { color: colors.text }]}>
            {content.title}
          </Text>
        )}
        <Text style={[typography.body, { color: colors.text }]}>
          {content.message}
        </Text>
        <Button
          title={t('common.gotIt')}
          variant="primary"
          onPress={onDismiss}
          style={styles.button}
        />
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
    borderRadius: CHROME_RADIUS,
    borderWidth: 1,
    gap: 12,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepIndicator: {
    fontFamily: mono.bold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  skip: {
    fontFamily: mono.bold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: mono.bold,
    marginBottom: 2,
  },
  button: {
    alignSelf: 'flex-end',
  },
});
