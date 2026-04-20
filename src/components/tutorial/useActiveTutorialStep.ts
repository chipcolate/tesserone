import { useTutorialStore, TutorialStepId } from '../../stores/tutorial';

export type TutorialContext = {
  cardCount: number;
  selectedCardIdx: number;
  fabOpen: boolean;
  reorderMode: boolean;
};

export type TutorialStepDef = {
  id: TutorialStepId;
  title?: string;
  message: string;
  /** Which UI element to spotlight (null = centered, no cutout). */
  target: 'fab' | 'reorderItem' | null;
};

const STEPS: Record<TutorialStepId, Omit<TutorialStepDef, 'id'>> = {
  'home-add-first': {
    title: 'Add your first card',
    message: 'Tap the menu button, then choose Add Card to get started.',
    target: 'fab',
  },
  'home-tap-expand': {
    title: 'Open a card',
    message: 'Tap any card in the stack to bring it forward and see its details.',
    target: null,
  },
  'expanded-tips': {
    title: 'Your card, expanded',
    message:
      'Tap the card again to flip it and reveal the barcode.\nSwipe up to send it back.\nLong-press to edit.',
    target: null,
  },
  'home-scroll': {
    title: 'Browse the stack',
    message: 'Drag up or down to scroll through your cards.',
    target: null,
  },
  'home-reorder-hint': {
    title: 'Rearrange your cards',
    message: 'Tap Reorder to enter reorder mode, then drag cards to your preferred order.',
    target: 'reorderItem',
  },
  'reorder-drag': {
    title: 'Drag to rearrange',
    message: 'Long-press a card and drag it to a new spot. Tap Done when you are finished.',
    target: null,
  },
};

/**
 * Picks the highest-priority unseen tutorial step that matches the current UI context.
 * Returns null when no tip should be shown.
 */
export function useActiveTutorialStep(ctx: TutorialContext): TutorialStepDef | null {
  const enabled = useTutorialStore((s) => s.enabled);
  const seenSteps = useTutorialStore((s) => s.seenSteps);

  if (!enabled) return null;

  const seen = (id: TutorialStepId) => !!seenSteps[id];
  const make = (id: TutorialStepId): TutorialStepDef => ({ id, ...STEPS[id] });

  // Highest priority: contextual to the current interaction
  if (ctx.reorderMode && !seen('reorder-drag')) return make('reorder-drag');
  if (ctx.selectedCardIdx >= 0 && !seen('expanded-tips')) return make('expanded-tips');
  if (ctx.fabOpen && ctx.cardCount >= 2 && !seen('home-reorder-hint'))
    return make('home-reorder-hint');

  // Resting home-screen tips: only when no other UI is engaged
  const atRest = !ctx.reorderMode && !ctx.fabOpen && ctx.selectedCardIdx === -1;
  if (atRest) {
    if (ctx.cardCount === 0 && !seen('home-add-first')) return make('home-add-first');
    if (ctx.cardCount >= 1 && !seen('home-tap-expand')) return make('home-tap-expand');
    if (ctx.cardCount >= 2 && !seen('home-scroll')) return make('home-scroll');
  }

  return null;
}
