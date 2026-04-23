import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FidelityCard, CardId, SortMode } from '../types';
import { deleteCustomLogo, customLogoFilename } from '../services/logos';

type CardsState = {
  cards: Record<CardId, FidelityCard>;
  addCard: (card: FidelityCard) => void;
  updateCard: (id: CardId, patch: Partial<FidelityCard>) => void;
  removeCard: (id: CardId) => void;
  reorderCard: (id: CardId, newIndex: number) => void;
  clearAll: () => void;
};

export const useCardsStore = create<CardsState>()(
  persist(
    (set, get) => ({
      cards: {},

      addCard: (card) =>
        set((s) => {
          const maxIndex = Math.max(0, ...Object.values(s.cards).map((c) => c.sortIndex));
          return {
            cards: {
              ...s.cards,
              [card.id]: { ...card, sortIndex: card.sortIndex ?? maxIndex + 1 },
            },
          };
        }),

      updateCard: (id, patch) =>
        set((s) => {
          if (!s.cards[id]) return s;
          return {
            cards: {
              ...s.cards,
              [id]: { ...s.cards[id], ...patch, updatedAt: new Date().toISOString() },
            },
          };
        }),

      removeCard: (id) =>
        set((s) => {
          const { [id]: removed, ...rest } = s.cards;
          if (removed) deleteCustomLogo(removed.customLogoUri);
          return { cards: rest };
        }),

      reorderCard: (id, newIndex) =>
        set((s) => {
          const list = getSortedCards(s.cards, 'manual');
          const oldIdx = list.findIndex((c) => c.id === id);
          if (oldIdx === -1) return s;

          const moved = list.splice(oldIdx, 1)[0];
          list.splice(newIndex, 0, moved);

          const updated: Record<CardId, FidelityCard> = {};
          list.forEach((card, i) => {
            updated[card.id] = { ...card, sortIndex: i };
          });
          return { cards: updated };
        }),

      clearAll: () =>
        set((s) => {
          for (const card of Object.values(s.cards)) deleteCustomLogo(card.customLogoUri);
          return { cards: {} };
        }),
    }),
    {
      name: 'cards',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as CardsState | undefined;
        if (!state?.cards) return state ?? ({ cards: {} } as CardsState);
        // v1 → v2: `customLogoUri` stored the full `file://` URI; collapse
        // to a bare filename so it keeps resolving after app data container
        // UUID changes or URI normalization drift.
        if (version < 2) {
          const next: Record<CardId, FidelityCard> = {};
          for (const [id, card] of Object.entries(state.cards)) {
            next[id] = {
              ...card,
              customLogoUri: customLogoFilename(card.customLogoUri),
            };
          }
          return { ...state, cards: next };
        }
        return state;
      },
    }
  )
);

export function getSortedCards(
  cards: Record<CardId, FidelityCard>,
  sortMode: SortMode
): FidelityCard[] {
  const list = Object.values(cards);
  switch (sortMode) {
    case 'manual':
      return list.sort((a, b) => a.sortIndex - b.sortIndex);
    case 'alphabetical':
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case 'dateCreated':
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export function nextSortIndex(cards: Record<CardId, FidelityCard>): number {
  const values = Object.values(cards);
  if (values.length === 0) return 0;
  return Math.max(...values.map((c) => c.sortIndex)) + 1;
}
