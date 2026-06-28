import React from 'react';
import { Appearance } from 'react-native';
import type { WidgetInfo } from 'react-native-android-widget';
import {
  CARD_LIST_WIDGET,
  SINGLE_CARD_WIDGET,
  loadWidgetConfig,
  type ListWidgetConfig,
  type SingleWidgetConfig,
} from './config';
import { getCardById, getCardsByIds, getOrderedCards } from './data';
import { CardListWidget, SingleCardWidget, type WidgetTheme } from './CardWidgets';
import { ensureWidgetI18n } from './i18n';

const DEFAULT_LIST_COUNT = 12;

/**
 * Build the widget element for a given instance, reading its saved card
 * selection and falling back to sensible defaults when not yet configured.
 *
 * The widget follows the system theme: rather than the library's `{light,dark}`
 * (whose day/night image swap proved unreliable), we read the current system
 * appearance and render the matching variant. The widget re-renders — and thus
 * picks up a theme change — on the next data update.
 */
export async function buildWidget(widgetInfo: WidgetInfo) {
  await ensureWidgetI18n();
  const theme: WidgetTheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';

  if (widgetInfo.widgetName === SINGLE_CARD_WIDGET) {
    const cfg = await loadWidgetConfig<SingleWidgetConfig>(widgetInfo.widgetId);
    let card = cfg?.cardId ? await getCardById(cfg.cardId) : null;
    if (!card) card = (await getOrderedCards())[0] ?? null;
    return <SingleCardWidget card={card} theme={theme} />;
  }

  // CARD_LIST_WIDGET (default branch)
  const cfg = await loadWidgetConfig<ListWidgetConfig>(widgetInfo.widgetId);
  let cards = cfg?.cardIds?.length ? await getCardsByIds(cfg.cardIds) : [];
  if (!cards.length) cards = (await getOrderedCards()).slice(0, DEFAULT_LIST_COUNT);
  return (
    <CardListWidget cards={cards} width={widgetInfo.width} height={widgetInfo.height} theme={theme} />
  );
}

export { CARD_LIST_WIDGET, SINGLE_CARD_WIDGET };
