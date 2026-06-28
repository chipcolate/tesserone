import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  copyWidgetLogo,
  pruneWidgetLogos,
  reloadWidgets,
  writeWidgetSnapshot,
} from '../../modules/widget-bridge';
import { getSortedCards, useCardsStore } from '../stores/cards';
import { useSettingsStore } from '../stores/settings';
import { resolveCardColor } from './logos';
import { logoTargetFor, resolveLogoUri, toSnapshotCard } from './cardSnapshot';
import type { WatchSnapshotCard } from '../types';

/** App Group shared with the iOS widget extension (and the Share Extension). */
export const WIDGET_APP_GROUP = 'group.com.chipcolate.tesserone';
export const WIDGET_SCHEMA_VERSION = 1;

const KNOWN_LOGOS_KEY = 'widget-known-logos';
const SNAPSHOT_DEBOUNCE_MS = 500;

interface WidgetSnapshot {
  schemaVersion: number;
  /** Cards in the user's current wallet order (the widget picker shows them as-is). */
  cards: WatchSnapshotCard[];
}

type KnownLogos = Record<string, string>;

let knownLogos: KnownLogos = {};
let lastSnapshotJson: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function buildSnapshot(): WidgetSnapshot {
  const { cards } = useCardsStore.getState();
  const { sortMode } = useSettingsStore.getState();
  // Emit cards in display order so the widget reflects the wallet's sorting.
  const ordered = getSortedCards(cards, sortMode);
  return {
    schemaVersion: WIDGET_SCHEMA_VERSION,
    // Resolve the effective background color here: the widget process can't read
    // brand-index.json, so bake brand primaryColor (or the default) into `color`.
    cards: ordered.map((c) => ({
      ...toSnapshotCard(c),
      color: resolveCardColor(c.color, c.logoSlug),
    })),
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

/** Copy each card's logo into the App Group, incrementally (by updatedAt). */
async function syncLogos(snap: WidgetSnapshot): Promise<void> {
  const { cards: stateCards } = useCardsStore.getState();
  const desired = new Map<string, { uri: string; updatedAt: string }>();

  for (const c of snap.cards) {
    const full = stateCards[c.id];
    if (!full) continue;
    const target = logoTargetFor(full);
    if (!target) continue;
    const uri = await resolveLogoUri(full);
    if (uri) desired.set(target.key, { uri, updatedAt: c.updatedAt });
  }

  for (const [key, { uri, updatedAt }] of desired) {
    if (knownLogos[key] === updatedAt) continue;
    const ok = await copyWidgetLogo(WIDGET_APP_GROUP, key, uri);
    if (ok) knownLogos[key] = updatedAt;
  }

  // Prune stale entries (deleted cards / changed logo slugs) on disk and locally.
  const keep = new Set(desired.keys());
  await pruneWidgetLogos(WIDGET_APP_GROUP, [...keep]);
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

  const wrote = await writeWidgetSnapshot(WIDGET_APP_GROUP, json);
  if (!wrote) {
    lastSnapshotJson = null;
    return;
  }
  await syncLogos(snap);
  reloadWidgets();
}

function schedulePush(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushSnapshotIfChanged();
  }, SNAPSHOT_DEBOUNCE_MS);
}

/**
 * Boot the home-screen widget sync. On iOS, mirrors the card/settings stores
 * into the App Group container that the WidgetKit extension reads. (Android
 * widgets render from the JS store directly via react-native-android-widget and
 * are refreshed in its own integration.) Returns a cleanup function.
 */
export async function startWidgetSync(): Promise<() => void> {
  if (Platform.OS === 'android') return startAndroidWidgetSync();
  if (Platform.OS !== 'ios') return () => {};

  knownLogos = await loadKnownLogos();

  const unsubCards = useCardsStore.subscribe(schedulePush);
  const unsubSettings = useSettingsStore.subscribe(schedulePush);

  schedulePush();

  return () => {
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
    unsubCards();
    unsubSettings();
  };
}

/**
 * Android widgets render from the JS store via react-native-android-widget's
 * headless task. On card/settings changes we ask it to re-render every added
 * widget. Imports are deferred (require) so the Android-only library never
 * loads on iOS.
 */
function startAndroidWidgetSync(): () => void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { requestWidgetUpdate } = require('react-native-android-widget');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { buildWidget } = require('../widgets/render');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { SINGLE_CARD_WIDGET, CARD_LIST_WIDGET } = require('../widgets/config');

  let timer: ReturnType<typeof setTimeout> | null = null;

  const push = () => {
    for (const widgetName of [SINGLE_CARD_WIDGET, CARD_LIST_WIDGET]) {
      requestWidgetUpdate({
        widgetName,
        renderWidget: (info: unknown) => buildWidget(info),
        widgetNotFound: () => {},
      }).catch(() => {});
    }
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      push();
    }, SNAPSHOT_DEBOUNCE_MS);
  };

  const unsubCards = useCardsStore.subscribe(schedule);
  const unsubSettings = useSettingsStore.subscribe(schedule);
  schedule();

  return () => {
    if (timer) clearTimeout(timer);
    unsubCards();
    unsubSettings();
  };
}
