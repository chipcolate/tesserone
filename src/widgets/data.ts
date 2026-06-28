import { Image } from 'react-native';
import { getSortedCards, useCardsStore } from '../stores/cards';
import { useSettingsStore } from '../stores/settings';
import {
  customLogoToDataUri,
  getBrandLogo,
  resolveCardColor,
} from '../services/logos';
import { textOnColor } from '../theme/colors';
import type { FidelityCard, SortMode } from '../types';

/**
 * A card reduced to what an Android widget needs to render. `image` is either a
 * bundled-logo `require()` handle (number), a base64 `data:` URI for a custom
 * logo, or null (render the initial instead). Read directly from AsyncStorage so
 * it works inside the headless widget task, where the zustand store may not be
 * hydrated.
 */
export interface WidgetCardData {
  id: string;
  name: string;
  color: `#${string}`;
  textColor: `#${string}`;
  initial: string;
  image: number | string | null;
  /** Logo width/height ratio, so the widget can fit it without stretching. */
  imageAspect: number;
}

// Read through the persisted stores (rehydrating from AsyncStorage) rather than
// hand-parsing the `{ state, version }` blob: this keeps the widget on the same
// persist keys + version migrations the stores own, so a future store change
// can't silently leave the headless task reading an empty wallet.
async function loadCards(): Promise<Record<string, FidelityCard>> {
  try {
    await useCardsStore.persist.rehydrate();
    return useCardsStore.getState().cards;
  } catch {
    return {};
  }
}

async function loadSortMode(): Promise<SortMode> {
  try {
    await useSettingsStore.persist.rehydrate();
    return useSettingsStore.getState().sortMode;
  } catch {
    return 'manual';
  }
}

// Cache the base64 data URI for a custom logo by card id + updatedAt, so repeated
// widget renders don't re-read and re-encode the same unchanged file from disk.
const customLogoCache = new Map<string, { updatedAt: string; uri: string | null }>();

async function customLogoDataUri(card: FidelityCard): Promise<string | null> {
  if (!card.customLogoUri) return null;
  const hit = customLogoCache.get(card.id);
  if (hit && hit.updatedAt === card.updatedAt) return hit.uri;
  const uri = await customLogoToDataUri(card.customLogoUri);
  customLogoCache.set(card.id, { updatedAt: card.updatedAt, uri });
  return uri;
}

async function toWidgetCard(card: FidelityCard): Promise<WidgetCardData> {
  const color = resolveCardColor(card.color, card.logoSlug) as `#${string}`;
  let image: number | string | null = null;
  // Custom logos are square-cropped on capture, so aspect 1 is correct for them.
  let imageAspect = 1;
  if (card.customLogoUri) {
    image = await customLogoDataUri(card);
  } else if (card.logoSlug) {
    const src = getBrandLogo(card.logoSlug);
    if (typeof src === 'number') {
      image = src;
      const meta = Image.resolveAssetSource(src);
      if (meta?.width && meta?.height) imageAspect = meta.width / meta.height;
    }
  }
  return {
    id: card.id,
    name: card.name,
    color,
    textColor: textOnColor(color) as `#${string}`,
    initial: (card.name.trim()[0] ?? '?').toUpperCase(),
    image,
    imageAspect,
  };
}

/** All cards in the user's wallet order. */
export async function getOrderedCards(): Promise<WidgetCardData[]> {
  const [cards, sortMode] = await Promise.all([loadCards(), loadSortMode()]);
  const ordered = getSortedCards(cards, sortMode);
  return Promise.all(ordered.map(toWidgetCard));
}

export async function getCardById(id: string): Promise<WidgetCardData | null> {
  const card = (await loadCards())[id];
  return card ? toWidgetCard(card) : null;
}

/** Resolve cards for the given ids, preserving the requested order. */
export async function getCardsByIds(ids: string[]): Promise<WidgetCardData[]> {
  const cards = await loadCards();
  const out: WidgetCardData[] = [];
  for (const id of ids) {
    const card = cards[id];
    if (card) out.push(await toWidgetCard(card));
  }
  return out;
}
