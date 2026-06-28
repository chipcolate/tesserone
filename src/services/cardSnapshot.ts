import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  customLogoFilename,
  resolveBundledLogoUri,
  resolveCustomLogoUri,
} from './logos';
import { useCardsStore } from '../stores/cards';
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

// ---------------------------------------------------------------------------
// Shared logo-sync orchestration
//
// The watch sync (`watch.ts`) and the home-screen widget sync (`widgets.ts`)
// both push a snapshot off-device and then incrementally deliver each card's
// logo, skipping logos already delivered (tracked by `updatedAt`) and pruning
// stale ones. The transport differs (WatchConnectivity file transfer vs. an
// App Group file copy) but the bookkeeping is identical — it lives here so the
// two surfaces can never drift on which logo a card needs or when to re-send it.
// ---------------------------------------------------------------------------

export type KnownLogos = Record<string, string>;

/** Per-surface, persisted cache of which logo (by `updatedAt`) was delivered. */
export function createLogoCache(storageKey: string) {
  let known: KnownLogos = {};
  return {
    /** Load the persisted cache; call once at sync startup. */
    async load(): Promise<void> {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        known = raw ? JSON.parse(raw) : {};
      } catch {
        known = {};
      }
    },
    /** Forget everything (e.g. a freshly installed watch needs all logos again). */
    reset(): void {
      known = {};
    },
    get(key: string): string | undefined {
      return known[key];
    },
    set(key: string, updatedAt: string): void {
      known[key] = updatedAt;
    },
    /** Drop entries whose key isn't in `keep` (deleted cards / changed slugs). */
    retain(keep: Set<string>): void {
      for (const k of Object.keys(known)) {
        if (!keep.has(k)) delete known[k];
      }
    },
    async persist(): Promise<void> {
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(known));
      } catch {
        // best-effort
      }
    },
  };
}

/**
 * Resolve the logos a snapshot needs, keyed by stable logo identity →
 * `{ on-disk uri, card updatedAt }`. Cards without a resolvable logo are
 * skipped. Shared by both syncs so the "which logo for this card" decision
 * lives in exactly one place.
 */
export async function buildDesiredLogos(
  snapCards: { id: string; updatedAt: string }[]
): Promise<Map<string, { uri: string; updatedAt: string }>> {
  const { cards: stateCards } = useCardsStore.getState();
  const desired = new Map<string, { uri: string; updatedAt: string }>();
  for (const c of snapCards) {
    const full = stateCards[c.id];
    if (!full) continue;
    const target = logoTargetFor(full);
    if (!target) continue;
    const uri = await resolveLogoUri(full);
    if (uri) desired.set(target.key, { uri, updatedAt: c.updatedAt });
  }
  return desired;
}

/** Trailing-edge debouncer with a cancel for cleanup. */
export function createDebouncer(ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    schedule(fn: () => void): void {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn();
      }, ms);
    },
    cancel(): void {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
