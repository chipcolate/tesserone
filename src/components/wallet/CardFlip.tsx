import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';
import { FidelityCard } from '../../types';
import { CardFace } from './CardFace';
import { CardBack } from './CardBack';
import { frontFaceOpacity, backFaceOpacity } from './useCardStack';

interface CardFlipProps {
  card: FidelityCard;
  /** 0 = front visible, Math.PI = back visible. */
  flipProgress: SharedValue<number>;
}

/**
 * Wraps CardFace and CardBack with a rotateY flip.
 *
 * Container rotates based on flipProgress. Front and back both use
 * backfaceVisibility: 'hidden' so only the facing side is visible.
 * The back child is pre-rotated 180° so it renders correctly when
 * the container is at 180°.
 */
export const CardFlip = React.memo(function CardFlip({
  card,
  flipProgress,
}: CardFlipProps) {
  const frontStyle = useAnimatedStyle(() => {
    // Front is visible from 0° to 90°, hidden beyond
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${flipProgress.value}rad` },
      ],
      opacity: frontFaceOpacity(flipProgress.value),
    };
  });

  const backStyle = useAnimatedStyle(() => {
    // Back is visible from 90° to 180°, hidden before
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${flipProgress.value + Math.PI}rad` },
      ],
      opacity: backFaceOpacity(flipProgress.value),
    };
  });

  return (
    <>
      <Animated.View style={[styles.face, frontStyle]}>
        <CardFace card={card} />
      </Animated.View>
      <Animated.View style={[styles.face, backStyle]}>
        <CardBack card={card} />
      </Animated.View>
    </>
  );
});

const styles = StyleSheet.create({
  face: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: 'hidden',
  },
});
