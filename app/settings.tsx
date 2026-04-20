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
import { useTranslation } from 'react-i18next';
import { useTheme, typography, textOnColor } from '../src/theme';
import { useSettingsStore } from '../src/stores/settings';
import { useCardsStore, getSortedCards } from '../src/stores/cards';
import { useTutorialStore } from '../src/stores/tutorial';
import { ThemeMode } from '../src/types';
import { APP_LANGUAGES, LANGUAGE_LABELS, type LanguagePreference } from '../src/i18n';
import {
  exportCards,
  importCards,
  detectConflicts,
  mergeCards,
} from '../src/services/importExport';

const THEME_VALUES: ThemeMode[] = ['system', 'light', 'dark'];
const LANGUAGE_VALUES: LanguagePreference[] = ['system', ...APP_LANGUAGES];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const sortMode = useSettingsStore((s) => s.sortMode);
  const cards = useCardsStore((s) => s.cards);
  const clearAll = useCardsStore((s) => s.clearAll);
  const resetTutorial = useTutorialStore((s) => s.resetAll);
  const [importing, setImporting] = useState(false);

  const cardsList = getSortedCards(cards, sortMode);

  const themeLabel = (mode: ThemeMode) => {
    if (mode === 'system') return t('settings.themeSystem');
    if (mode === 'light') return t('settings.themeLight');
    return t('settings.themeDark');
  };

  const languageLabel = (pref: LanguagePreference) => {
    if (pref === 'system') return t('settings.languageSystem');
    return LANGUAGE_LABELS[pref];
  };

  const handleExport = async () => {
    const result = await exportCards(cardsList, { themeMode, sortMode });
    if (!result.success) {
      Alert.alert(t('settings.exportFailed'), result.error);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await importCards();
      if (!result.success) {
        if (result.error !== 'Import cancelled') {
          Alert.alert(t('settings.importFailed'), result.error);
        }
        return;
      }

      const imported = result.data!;
      const conflicts = detectConflicts(cards, imported.cards);

      if (conflicts === 0) {
        const merged = mergeCards(cards, imported.cards);
        useCardsStore.setState({ cards: merged });
        Alert.alert(
          t('settings.importComplete'),
          t('settings.importCompleteBody', { count: imported.cards.length })
        );
      } else {
        Alert.alert(
          t('settings.conflictsFound'),
          t('settings.conflictsFoundBody', { count: conflicts }),
          [
            {
              text: t('settings.conflictKeepExisting'),
              onPress: () => {
                const merged = mergeCards(cards, imported.cards, 'keepExisting');
                useCardsStore.setState({ cards: merged });
              },
            },
            {
              text: t('settings.conflictUseImported'),
              onPress: () => {
                const merged = mergeCards(cards, imported.cards, 'useImported');
                useCardsStore.setState({ cards: merged });
              },
            },
            {
              text: t('settings.conflictKeepNewer'),
              style: 'default',
              onPress: () => {
                const merged = mergeCards(cards, imported.cards, 'keepNewer');
                useCardsStore.setState({ cards: merged });
              },
            },
            { text: t('common.cancel'), style: 'cancel' },
          ]
        );
      }
    } finally {
      setImporting(false);
    }
  };

  const handleReplayTutorial = () => {
    resetTutorial();
    Alert.alert(t('settings.tutorialResetTitle'), t('settings.tutorialResetBody'));
  };

  const handleClearAll = () => {
    Alert.alert(
      t('settings.deleteAllTitle'),
      t('settings.deleteAllBody', { count: cardsList.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.deleteAllConfirm'), style: 'destructive', onPress: clearAll },
      ]
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[typography.cardName, { color: colors.text }]}>{t('settings.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('settings.sectionTheme')}
        </Text>
        <View style={[styles.segmented, { backgroundColor: colors.surface }]}>
          {THEME_VALUES.map((mode) => (
            <Pressable
              key={mode}
              style={[
                styles.segmentItem,
                themeMode === mode && { backgroundColor: colors.accent },
              ]}
              onPress={() => setThemeMode(mode)}
            >
              <Text
                style={[
                  typography.label,
                  {
                    color: themeMode === mode ? textOnColor(colors.accent) : colors.text,
                    fontWeight: themeMode === mode ? '700' : '400',
                  },
                ]}
              >
                {themeLabel(mode)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('settings.sectionLanguage')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {LANGUAGE_VALUES.map((pref, idx) => (
            <React.Fragment key={pref}>
              {idx > 0 ? <View style={[styles.divider, { backgroundColor: colors.bg }]} /> : null}
              <Pressable style={styles.row} onPress={() => setLanguage(pref)}>
                <Text style={[typography.body, { color: colors.text }]}>{languageLabel(pref)}</Text>
                {language === pref ? (
                  <Text style={[typography.body, { color: colors.accent, fontWeight: '700' }]}>
                    ✓
                  </Text>
                ) : null}
              </Pressable>
            </React.Fragment>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('settings.sectionData')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Pressable style={styles.row} onPress={handleExport}>
            <Text style={[typography.body, { color: colors.text }]}>
              {t('settings.exportCards')}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {t('settings.cardCount', { count: cardsList.length })}
            </Text>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.bg }]} />
          <Pressable style={styles.row} onPress={handleImport} disabled={importing}>
            <Text style={[typography.body, { color: colors.text }]}>
              {importing ? t('settings.importing') : t('settings.importCards')}
            </Text>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.bg }]} />
          <Pressable style={styles.row} onPress={handleReplayTutorial}>
            <Text style={[typography.body, { color: colors.text }]}>
              {t('settings.replayTutorial')}
            </Text>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.bg }]} />
          <Pressable style={styles.row} onPress={handleClearAll}>
            <Text style={[typography.body, { color: '#EF5350' }]}>
              {t('settings.deleteAll')}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('settings.sectionAbout')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <Text style={[typography.body, { color: colors.text }]}>Tesserone</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {t('settings.aboutVersion', { version: '1.0.0' })}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.bg }]} />
          <View style={styles.row}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {t('settings.aboutTagline')}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.bg }]} />
          <View style={styles.row}>
            <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
              {t('settings.aboutDisclaimer')}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.accent }]}
          onPress={() => router.back()}
        >
          <Text style={[typography.body, { color: '#fff', fontWeight: '700' }]}>
            {t('common.done')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
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
  bottomActions: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
});
