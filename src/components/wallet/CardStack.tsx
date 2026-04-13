import React, { useCallback, useEffect, useRef } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { FidelityCard } from '../../types';
import { CardItem } from './CardItem';
import { stackContentHeight, CardStackState } from './useCardStack';

export { useCardStack } from './useCardStack';
export type { CardStackState } from './useCardStack';

interface CardStackProps {
  cards: FidelityCard[];
  state: CardStackState;
  reorderMode: boolean;
  onReorder: (from: number, to: number) => void;
}

/**
 * Vertically scrollable card stack (Apple Wallet-style).
 * State is owned by the parent via useCardStack() so the parent
 * can control reorderMode and other shared values.
 */
export function CardStack({ cards, state, reorderMode, onReorder }: CardStackProps) {
  const lastViewportHeight = useRef(0);

  useEffect(() => {
    const vh = lastViewportHeight.current;
    if (vh === 0) return;
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
          <CardItem
            key={card.id}
            card={card}
            index={index}
            total={cards.length}
            state={state}
            reorderMode={reorderMode}
            onReorder={onReorder}
          />
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
