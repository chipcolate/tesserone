import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  startFileTransfer,
  updateApplicationContext,
  watchEvents,
  type WatchPayload,
} from 'react-native-watch-connectivity';
import { useCardsStore } from '../stores/cards';
import { useSettingsStore } from '../stores/settings';
import {
  customLogoFilename,
  resolveBundledLogoUri,
  resolveCustomLogoUri,
} from './logos';
import {
  WATCH_SCHEMA_VERSION,
  type FidelityCard,
  type WatchSnapshot,
  type WatchSnapshotCard,
} from '../types';

const KNOWN_LOGOS_KEY = 'watch-known-logos';
const SNAPSHOT_DEBOUNCE_MS = 500;

type KnownLogos = Record<string, string>;

let knownLogos: KnownLogos = {};
let lastSnapshotJson: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

type LogoTarget = { key: string; isCustom: boolean };

function logoTargetFor(card: FidelityCard): LogoTarget | null {
  if (customLogoFilename(card.customLogoUri)) {
    return { key: `custom:${card.id}`, isCustom: true };
  }
  if (card.logoSlug) {
    return { key: `bundled:${card.logoSlug}`, isCustom: false };
  }
  return null;
}

function buildSnapshot(): WatchSnapshot {
  const { cards } = useCardsStore.getState();
  const { sortMode, themeMode } = useSettingsStore.getState();
  const list = Object.values(cards).sort((a, b) => a.id.localeCompare(b.id));
  return {
    schemaVersion: WATCH_SCHEMA_VERSION,
    cards: list.map(
      (c): WatchSnapshotCard => ({
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
      })
    ),
    sortMode,
    themeMode,
  };
}

async function loadKnownLogos(): Promise<KnownLogos> {
  try {
    const raw = await AsyncStorage.getItem(KNOWN_LOGOS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function persistKnownLogos(): Promise<void> {
  try {
    await AsyncStorage.setItem(KNOWN_LOGOS_KEY, JSON.stringify(knownLogos));
  } catch {
    // best-effort
  }
}

async function syncLogos(snap: WatchSnapshot): Promise<void> {
  const { cards: stateCards } = useCardsStore.getState();
  const desired = new Map<string, { uri: string; updatedAt: string }>();

  for (const c of snap.cards) {
    const full = stateCards[c.id];
    if (!full) continue;
    const target = logoTargetFor(full);
    if (!target) continue;
    let uri: string | undefined;
    if (target.isCustom) {
      uri = resolveCustomLogoUri(full.customLogoUri);
    } else if (full.logoSlug) {
      uri = await resolveBundledLogoUri(full.logoSlug);
    }
    if (uri) desired.set(target.key, { uri, updatedAt: c.updatedAt });
  }

  for (const [key, { uri, updatedAt }] of desired) {
    if (knownLogos[key] === updatedAt) continue;
    try {
      await startFileTransfer(uri, {
        kind: 'logo',
        logoKey: key,
        updatedAt,
      });
      knownLogos[key] = updatedAt;
    } catch (e) {
      console.warn('[watch] transferFile failed for', key, e);
    }
  }

  // Prune stale entries (deleted cards / changed logo slugs).
  const keep = new Set(desired.keys());
  for (const k of Object.keys(knownLogos)) {
    if (!keep.has(k)) delete knownLogos[k];
  }
  await persistKnownLogos();
}

async function pushSnapshotIfChanged(): Promise<void> {
  const snap = buildSnapshot();
  const json = JSON.stringify(snap);
  if (json === lastSnapshotJson) return;
  lastSnapshotJson = json;
  try {
    updateApplicationContext(snap as unknown as WatchPayload);
  } catch (e) {
    console.warn('[watch] updateApplicationContext failed', e);
    lastSnapshotJson = null;
    return;
  }
  await syncLogos(snap);
}

function schedulePush(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushSnapshotIfChanged();
  }, SNAPSHOT_DEBOUNCE_MS);
}

async function handleLogoRequest(
  cardId: string,
  reply: ((resp: WatchPayload) => void) | null
): Promise<void> {
  const card = useCardsStore.getState().cards[cardId];
  if (!card) {
    reply?.({ ok: false, reason: 'unknownCard' });
    return;
  }
  const target = logoTargetFor(card);
  if (!target) {
    reply?.({ ok: false, reason: 'noLogo' });
    return;
  }
  const uri = target.isCustom
    ? resolveCustomLogoUri(card.customLogoUri)
    : card.logoSlug
      ? await resolveBundledLogoUri(card.logoSlug)
      : undefined;
  if (!uri) {
    reply?.({ ok: false, reason: 'unresolved' });
    return;
  }
  try {
    await startFileTransfer(uri, {
      kind: 'logo',
      logoKey: target.key,
      updatedAt: card.updatedAt,
    });
    knownLogos[target.key] = card.updatedAt;
    await persistKnownLogos();
    reply?.({ ok: true, logoKey: target.key });
  } catch {
    reply?.({ ok: false, reason: 'transferFailed' });
  }
}

async function handleWatchMessage(
  payload: WatchPayload & { id?: string },
  reply: ((resp: WatchPayload) => void) | null
): Promise<void> {
  const kind = (payload as { kind?: unknown }).kind;
  switch (kind) {
    case 'requestInitialSync': {
      knownLogos = {};
      lastSnapshotJson = null;
      await persistKnownLogos();
      await pushSnapshotIfChanged();
      reply?.({ ok: true });
      return;
    }
    case 'logoRequest': {
      const cardId = (payload as { cardId?: unknown }).cardId;
      if (typeof cardId !== 'string') {
        reply?.({ ok: false, reason: 'badRequest' });
        return;
      }
      await handleLogoRequest(cardId, reply);
      return;
    }
    default:
      reply?.({ ok: false, reason: 'unknownKind' });
  }
}

/**
 * Boot the iOS watch sync. No-op on Android. Returns a cleanup function;
 * the root layout never unmounts in normal use, so cleanup runs only on
 * Fast Refresh.
 */
export async function startWatchSync(): Promise<() => void> {
  if (Platform.OS !== 'ios') return () => {};

  knownLogos = await loadKnownLogos();

  const unsubCards = useCardsStore.subscribe(schedulePush);
  const unsubSettings = useSettingsStore.subscribe(schedulePush);
  const unsubMessages = watchEvents.on('message', (payload, reply) => {
    void handleWatchMessage(payload, reply);
  });

  schedulePush();

  return () => {
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
    unsubCards();
    unsubSettings();
    unsubMessages();
  };
}
