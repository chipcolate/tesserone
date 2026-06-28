import {
  customLogoFilename,
  resolveBundledLogoUri,
  resolveCustomLogoUri,
} from './logos';
import type { FidelityCard, WatchSnapshotCard } from '../types';

/**
 * Shared card → serializable-snapshot logic used by both the Apple Watch sync
 * (`watch.ts`) and the home-screen Widget sync (`widgets.ts`). Keeping the
 * card-mapping and logo-resolution in one place means the two consumers can
 * never drift on which fields (or which logo) a card exposes off-device.
 */

export type LogoTarget = { key: string; isCustom: boolean };

/**
 * The stable logo identity for a card: a user-uploaded custom logo keyed by
 * card id, or a bundled brand logo keyed by slug. `null` when the card has no
 * logo (rendered as a colored initial instead).
 */
export function logoTargetFor(card: FidelityCard): LogoTarget | null {
  if (customLogoFilename(card.customLogoUri)) {
    return { key: `custom:${card.id}`, isCustom: true };
  }
  if (card.logoSlug) {
    return { key: `bundled:${card.logoSlug}`, isCustom: false };
  }
  return null;
}

/** Resolve a card's logo to an on-disk `file://` URI, or undefined when none. */
export async function resolveLogoUri(card: FidelityCard): Promise<string | undefined> {
  const target = logoTargetFor(card);
  if (!target) return undefined;
  if (target.isCustom) {
    return resolveCustomLogoUri(card.customLogoUri);
  }
  if (card.logoSlug) {
    return resolveBundledLogoUri(card.logoSlug);
  }
  return undefined;
}

/** Map a single card to its serializable snapshot shape. */
export function toSnapshotCard(c: FidelityCard): WatchSnapshotCard {
  return {
    id: c.id,
    name: c.name,
    code: c.code,
    format: c.format,
    color: c.color,
    logoSlug: c.logoSlug,
    hasCustomLogo: !!customLogoFilename(c.customLogoUri),
    sortIndex: c.sortIndex,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

/**
 * Map the card map to a deterministic snapshot list, sorted by id so the
 * serialized JSON is stable (change-detection in the sync services compares
 * JSON strings).
 */
export function buildSnapshotCards(
  cards: Record<string, FidelityCard>
): WatchSnapshotCard[] {
  return Object.values(cards)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(toSnapshotCard);
}
