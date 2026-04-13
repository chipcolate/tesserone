import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, typography, textOnColor } from '../src/theme';
import { useSettingsStore } from '../src/stores/settings';
import { useCardsStore, getSortedCards } from '../src/stores/cards';
import { ThemeMode } from '../src/types';
import {
  exportCards,
  importCards,
  detectConflicts,
  mergeCards,
  type MergeStrategy,
} from '../src/services/importExport';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { themeMode, setThemeMode, sortMode } = useSettingsStore();
  const { cards, clearAll } = useCardsStore();
  const [importing, setImporting] = useState(false);

  const cardsList = getSortedCards(cards, sortMode);

  const handleExport = async () => {
    const result = await exportCards(cardsList, { themeMode, sortMode });
    if (!result.success) {
      Alert.alert('Export Failed', result.error);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await importCards();
      if (!result.success) {
        if (result.error !== 'Import cancelled') {
          Alert.alert('Import Failed', result.error);
        }
        return;
      }

      const imported = result.data!;
      const conflicts = detectConflicts(cards, imported.cards);

      if (conflicts === 0) {
        // No conflicts — merge directly
        const merged = mergeCards(cards, imported.cards);
        useCardsStore.setState({ cards: merged });
        Alert.alert('Import Complete', `${imported.cards.length} card(s) imported.`);
      } else {
        // Has conflicts — ask for strategy
        Alert.alert(
          'Conflicts Found',
          `${conflicts} card(s) already exist. How should we handle them?`,
          [
            {
              text: 'Keep Existing',
              onPress: () => {
                const merged = mergeCards(cards, imported.cards, 'keepExisting');
                useCardsStore.setState({ cards: merged });
              },
            },
            {
              text: 'Use Imported',
              onPress: () => {
                const merged = mergeCards(cards, imported.cards, 'useImported');
                useCardsStore.setState({ cards: merged });
              },
            },
            {
              text: 'Keep Newer',
              style: 'default',
              onPress: () => {
                const merged = mergeCards(cards, imported.cards, 'keepNewer');
                useCardsStore.setState({ cards: merged });
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    } finally {
      setImporting(false);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Delete All Cards',
      `This will permanently remove all ${cardsList.length} card(s). This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete All', style: 'destructive', onPress: clearAll },
      ]
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[typography.label, { color: colors.textSecondary }]}>Done</Text>
        </Pressable>
        <Text style={[typography.cardName, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Theme */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Theme</Text>
        <View style={[styles.segmented, { backgroundColor: colors.surface }]}>
          {THEME_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.segmentItem,
                themeMode === opt.value && { backgroundColor: colors.accent },
              ]}
              onPress={() => setThemeMode(opt.value)}
            >
              <Text
                style={[
                  typography.label,
                  {
                    color: themeMode === opt.value ? textOnColor(colors.accent) : colors.text,
                    fontWeight: themeMode === opt.value ? '700' : '400',
                  },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Data */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Data</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Pressable style={styles.row} onPress={handleExport}>
            <Text style={[typography.body, { color: colors.text }]}>Export Cards</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {cardsList.length} card{cardsList.length !== 1 ? 's' : ''}
            </Text>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.bg }]} />
          <Pressable style={styles.row} onPress={handleImport} disabled={importing}>
            <Text style={[typography.body, { color: colors.text }]}>
              {importing ? 'Importing...' : 'Import Cards'}
            </Text>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.bg }]} />
          <Pressable style={styles.row} onPress={handleClearAll}>
            <Text style={[typography.body, { color: '#EF5350' }]}>Delete All Cards</Text>
          </Pressable>
        </View>

        {/* About */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>About</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <Text style={[typography.body, { color: colors.text }]}>Tesserone</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>v1.0.0</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.bg }]} />
          <View style={styles.row}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              The loyalty card manager that feels alive.{'\n'}Open source · Made by Chipcolate
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: {
    height: 1,
  },
});
