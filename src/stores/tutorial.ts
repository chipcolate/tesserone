import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TutorialStepId =
  | 'home-add-first'
  | 'home-tap-expand'
  | 'expanded-tips'
  | 'home-scroll'
  | 'home-reorder-hint'
  | 'reorder-drag';

type TutorialState = {
  enabled: boolean;
  seenSteps: Partial<Record<TutorialStepId, boolean>>;
  markSeen: (id: TutorialStepId) => void;
  resetAll: () => void;
  setEnabled: (v: boolean) => void;
};

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      enabled: true,
      seenSteps: {},
      markSeen: (id) =>
        set((s) => ({ seenSteps: { ...s.seenSteps, [id]: true } })),
      resetAll: () => set({ seenSteps: {} }),
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'tutorial',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);
