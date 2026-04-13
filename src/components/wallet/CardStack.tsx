import React, { useCallback, useEffect, useRef } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { FidelityCard } from '../../types';
import { CardItem } from './CardItem';
import { useCardStack, stackContentHeight } from './useCardStack';

interface CardStackProps {
  cards: FidelityCard[];
}

/**
 * Vertically scrollable card stack (Apple Wallet-style).
 *
 * maxScroll is recomputed whenever the viewport height or card count
 * changes, so async store hydration and card add/remove are handled.
 */
export function CardStack({ cards }: CardStackProps) {
  const state = useCardStack();
  const lastViewportHeight = useRef(0);

  // Recompute maxScroll whenever card count changes (e.g. store hydration)
  useEffect(() => {
    const vh = lastViewportHeight.current;
    if (vh === 0) return; // layout hasn't fired yet
    const contentHeight = stackContentHeight(cards.length);
    state.maxScroll.value = Math.max(0, contentHeight - vh);
    if (state.scrollOffset.value > state.maxScroll.value) {
      state.scrollOffset.value = state.maxScroll.value;
    }
  }, [cards.length]);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const vh = event.nativeEvent.layout.height;
      lastViewportHeight.current = vh;
      state.viewportHeight.value = vh;
      const contentHeight = stackContentHeight(cards.length);
      state.maxScroll.value = Math.max(0, contentHeight - vh);
      if (state.scrollOffset.value > state.maxScroll.value) {
        state.scrollOffset.value = state.maxScroll.value;
      }
    },
    [cards.length, state.maxScroll, state.scrollOffset, state.viewportHeight]
  );

  return (
    <GestureDetector gesture={state.panGesture}>
      <View style={styles.container} onLayout={handleLayout}>
        {cards.map((card, index) => (
          <CardItem key={card.id} card={card} index={index} total={cards.length} state={state} />
        ))}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
});
