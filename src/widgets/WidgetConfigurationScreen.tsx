import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { WidgetConfigurationScreenProps } from 'react-native-android-widget';
import { i18n } from '../i18n';
import {
  SINGLE_CARD_WIDGET,
  loadWidgetConfig,
  saveWidgetConfig,
  type ListWidgetConfig,
  type SingleWidgetConfig,
} from './config';
import { getOrderedCards, type WidgetCardData } from './data';
import { ensureWidgetI18n } from './i18n';
import { buildWidget } from './render';

// Rendered by react-native-android-widget in its own React root (no ThemeProvider
// / i18n bootstrap), so this screen uses plain RN with system monospace and
// initializes i18next itself.
export function WidgetConfigurationScreen({
  widgetInfo,
  renderWidget,
  setResult,
}: WidgetConfigurationScreenProps) {
  const isSingle = widgetInfo.widgetName === SINGLE_CARD_WIDGET;
  const [cards, setCards] = useState<WidgetCardData[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureWidgetI18n().then(() => setReady(true));
    getOrderedCards().then(setCards);
    // Pre-load the existing selection so reconfiguring an existing widget keeps
    // its cards instead of starting from scratch.
    if (isSingle) {
      loadWidgetConfig<SingleWidgetConfig>(widgetInfo.widgetId).then((cfg) => {
        if (cfg?.cardId) setSelected([cfg.cardId]);
      });
    } else {
      loadWidgetConfig<ListWidgetConfig>(widgetInfo.widgetId).then((cfg) => {
        if (cfg?.cardIds?.length) setSelected(cfg.cardIds);
      });
    }
  }, [isSingle, widgetInfo.widgetId]);

  // Avoid flashing raw i18n keys before init resolves.
  if (!ready) return <View style={styles.root} />;
  const t = i18n.t.bind(i18n);

  const toggle = (id: string) => {
    if (isSingle) {
      setSelected([id]);
    } else {
      setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    }
  };

  const confirm = async () => {
    await saveWidgetConfig(
      widgetInfo.widgetId,
      isSingle ? { cardId: selected[0] ?? null } : { cardIds: selected }
    );
    renderWidget(await buildWidget(widgetInfo));
    setResult('ok');
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>
        {isSingle ? t('widget.pickOne') : t('widget.pickMany')}
      </Text>
      <FlatList
        data={cards}
        keyExtractor={(c) => c.id}
        style={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('widget.configEmpty')}</Text>}
        renderItem={({ item }) => {
          const isSel = selected.includes(item.id);
          return (
            <Pressable
              onPress={() => toggle(item.id)}
              style={[styles.row, isSel && styles.rowSelected]}
            >
              <View style={[styles.swatch, { backgroundColor: item.color }]}>
                {item.image != null ? (
                  <Image
                    source={typeof item.image === 'number' ? item.image : { uri: item.image }}
                    style={styles.swatchImg}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={[styles.swatchInitial, { color: item.textColor }]}>
                    {item.initial}
                  </Text>
                )}
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              {isSel ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          );
        }}
      />
      <View style={styles.actions}>
        <Pressable style={styles.btn} onPress={() => setResult('cancel')}>
          <Text style={styles.btnText}>{t('common.cancel')}</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.btnPrimary, selected.length === 0 && styles.btnDisabled]}
          disabled={selected.length === 0}
          onPress={confirm}
        >
          <Text style={[styles.btnText, styles.btnPrimaryText]}>{t('common.save')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A', padding: 16 },
  title: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    fontSize: 16,
    color: '#F5F5F5',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  list: { flex: 1 },
  empty: { fontFamily: 'monospace', color: '#888888', paddingVertical: 24, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 8,
    gap: 12,
  },
  rowSelected: { borderColor: '#F5F5F5' },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  swatchImg: { width: 30, height: 30 },
  swatchInitial: { fontFamily: 'monospace', fontWeight: 'bold', fontSize: 18 },
  name: { flex: 1, fontFamily: 'monospace', fontSize: 15, color: '#F5F5F5' },
  check: { fontFamily: 'monospace', fontSize: 18, color: '#F5F5F5' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: '#F5F5F5', borderColor: '#F5F5F5' },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    fontSize: 14,
    color: '#F5F5F5',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  btnPrimaryText: { color: '#0A0A0A' },
});
