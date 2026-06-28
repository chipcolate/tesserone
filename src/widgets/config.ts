import AsyncStorage from '@react-native-async-storage/async-storage';

/** Widget `name`s — must match the entries in app.json's widget plugin config. */
export const SINGLE_CARD_WIDGET = 'SingleCard';
export const CARD_LIST_WIDGET = 'CardList';

export interface SingleWidgetConfig {
  cardId: string | null;
}
export interface ListWidgetConfig {
  cardIds: string[];
}

// Per-widget-instance selection, keyed by the system-assigned widgetId.
const cfgKey = (widgetId: number) => `widget:cfg:${widgetId}`;

export async function loadWidgetConfig<T>(widgetId: number): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(cfgKey(widgetId));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function saveWidgetConfig(widgetId: number, config: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(cfgKey(widgetId), JSON.stringify(config));
  } catch {
    // best-effort
  }
}

export async function clearWidgetConfig(widgetId: number): Promise<void> {
  try {
    await AsyncStorage.removeItem(cfgKey(widgetId));
  } catch {
    // best-effort
  }
}
