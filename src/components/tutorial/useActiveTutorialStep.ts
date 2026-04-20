import { useTranslation } from 'react-i18next';
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

const STEP_TARGETS: Record<TutorialStepId, TutorialStepDef['target']> = {
  'home-add-first': 'fab',
  'home-tap-expand': null,
  'expanded-tips': null,
  'home-scroll': null,
  'home-reorder-hint': 'reorderItem',
  'reorder-drag': null,
};

const STEP_KEY: Record<TutorialStepId, { title: string; message: string }> = {
  'home-add-first': {
    title: 'tutorial.homeAddFirstTitle',
    message: 'tutorial.homeAddFirstMessage',
  },
  'home-tap-expand': {
    title: 'tutorial.homeTapExpandTitle',
    message: 'tutorial.homeTapExpandMessage',
  },
  'expanded-tips': {
    title: 'tutorial.expandedTipsTitle',
    message: 'tutorial.expandedTipsMessage',
  },
  'home-scroll': {
    title: 'tutorial.homeScrollTitle',
    message: 'tutorial.homeScrollMessage',
  },
  'home-reorder-hint': {
    title: 'tutorial.homeReorderHintTitle',
    message: 'tutorial.homeReorderHintMessage',
  },
  'reorder-drag': {
    title: 'tutorial.reorderDragTitle',
    message: 'tutorial.reorderDragMessage',
  },
};

/**
 * Picks the highest-priority unseen tutorial step that matches the current UI context.
 * Returns null when no tip should be shown.
 */
export function useActiveTutorialStep(ctx: TutorialContext): TutorialStepDef | null {
  const enabled = useTutorialStore((s) => s.enabled);
  const seenSteps = useTutorialStore((s) => s.seenSteps);
  const { t } = useTranslation();

  if (!enabled) return null;

  const seen = (id: TutorialStepId) => !!seenSteps[id];
  const make = (id: TutorialStepId): TutorialStepDef => ({
    id,
    title: t(STEP_KEY[id].title),
    message: t(STEP_KEY[id].message),
    target: STEP_TARGETS[id],
  });

  if (ctx.reorderMode && !seen('reorder-drag')) return make('reorder-drag');
  if (ctx.selectedCardIdx >= 0 && !seen('expanded-tips')) return make('expanded-tips');
  if (ctx.fabOpen && ctx.cardCount >= 2 && !seen('home-reorder-hint'))
    return make('home-reorder-hint');

  const atRest = !ctx.reorderMode && !ctx.fabOpen && ctx.selectedCardIdx === -1;
  if (atRest) {
    if (ctx.cardCount === 0 && !seen('home-add-first')) return make('home-add-first');
    if (ctx.cardCount >= 1 && !seen('home-tap-expand')) return make('home-tap-expand');
    if (ctx.cardCount >= 2 && !seen('home-scroll')) return make('home-scroll');
  }

  return null;
}
