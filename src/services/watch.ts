import { Platform } from 'react-native';
import {
  startFileTransfer,
  updateApplicationContext,
  watchEvents,
  type WatchPayload,
} from 'react-native-watch-connectivity';
import { useCardsStore } from '../stores/cards';
import { useSettingsStore } from '../stores/settings';
import {
  buildSnapshotCards,
  buildDesiredLogos,
  createDebouncer,
  createLogoCache,
  logoTargetFor,
  resolveLogoUri,
} from './cardSnapshot';
import { WATCH_SCHEMA_VERSION, type WatchSnapshot } from '../types';

const SNAPSHOT_DEBOUNCE_MS = 500;

const logoCache = createLogoCache('watch-known-logos');
const pushDebouncer = createDebouncer(SNAPSHOT_DEBOUNCE_MS);
let lastSnapshotJson: string | null = null;

function buildSnapshot(): WatchSnapshot {
  const { cards } = useCardsStore.getState();
  const { sortMode, themeMode } = useSettingsStore.getState();
  return {
    schemaVersion: WATCH_SCHEMA_VERSION,
    cards: buildSnapshotCards(cards),
    sortMode,
    themeMode,
  };
}

async function syncLogos(snap: WatchSnapshot): Promise<void> {
  const desired = await buildDesiredLogos(snap.cards);

  for (const [key, { uri, updatedAt }] of desired) {
    if (logoCache.get(key) === updatedAt) continue;
    try {
      await startFileTransfer(uri, {
        kind: 'logo',
        logoKey: key,
        updatedAt,
      });
      logoCache.set(key, updatedAt);
    } catch (e) {
      console.warn('[watch] transferFile failed for', key, e);
    }
  }

  // Prune stale entries (deleted cards / changed logo slugs).
  logoCache.retain(new Set(desired.keys()));
  await logoCache.persist();
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
  pushDebouncer.schedule(() => {
    void pushSnapshotIfChanged();
  });
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
  const uri = await resolveLogoUri(card);
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
    logoCache.set(target.key, card.updatedAt);
    await logoCache.persist();
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
      logoCache.reset();
      lastSnapshotJson = null;
      await logoCache.persist();
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

function forceFreshPush(reason: 'reachable' | 'installed'): void {
  lastSnapshotJson = null;
  if (reason === 'installed') {
    // Newly installed watch has no logos; force re-transfer.
    logoCache.reset();
    void logoCache.persist();
  }
  schedulePush();
}

/**
 * Boot the iOS watch sync. No-op on Android. Returns a cleanup function;
 * the root layout never unmounts in normal use, so cleanup runs only on
 * Fast Refresh.
 */
export async function startWatchSync(): Promise<() => void> {
  if (Platform.OS !== 'ios') return () => {};

  await logoCache.load();

  const unsubCards = useCardsStore.subscribe(schedulePush);
  const unsubSettings = useSettingsStore.subscribe(schedulePush);
  const unsubMessages = watchEvents.on('message', (payload, reply) => {
    void handleWatchMessage(payload, reply);
  });
  const unsubReachable = watchEvents.on('reachability', (reachable) => {
    if (reachable) forceFreshPush('reachable');
  });
  const unsubInstalled = watchEvents.on('installed', (installed) => {
    if (installed) forceFreshPush('installed');
  });

  schedulePush();

  return () => {
    pushDebouncer.cancel();
    unsubCards();
    unsubSettings();
    unsubMessages();
    unsubReachable();
    unsubInstalled();
  };
}
