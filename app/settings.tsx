import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme, typography, textOnColor } from '../src/theme';
import { CHROME_RADIUS } from '../src/theme/geometry';
import { mono } from '../src/theme/fonts';
import { Panel } from '../src/components/ui/Panel';
import { Sheet } from '../src/components/ui/Sheet';
import { Button } from '../src/components/ui/Button';
import { ActionBar } from '../src/components/ui/ActionBar';
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
  const [exporting, setExporting] = useState(false);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);

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
    setExporting(true);
    try {
      const result = await exportCards(cardsList, { themeMode, sortMode });
      if (!result.success) {
        Alert.alert(t('settings.exportFailed'), result.error);
      }
    } finally {
      setExporting(false);
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

  const Divider = () => <View style={[styles.divider, { backgroundColor: colors.border }]} />;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Text style={[typography.cardName, { color: colors.text }]}>{t('settings.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('settings.sectionTheme')}
        </Text>
        <View style={[styles.segmented, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                style={{
                  fontFamily: themeMode === mode ? mono.bold : mono.regular,
                  fontSize: 14,
                  color: themeMode === mode ? textOnColor(colors.accent) : colors.text,
                }}
              >
                {themeLabel(mode)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('settings.sectionLanguage')}
        </Text>
        <Panel>
          <Pressable style={styles.row} onPress={() => setLanguagePickerOpen(true)}>
            <Text style={[typography.body, { color: colors.text }]}>
              {languageLabel(language)}
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary }]}>›</Text>
          </Pressable>
        </Panel>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('settings.sectionData')}
        </Text>
        <Panel>
          <Pressable style={styles.row} onPress={handleExport} disabled={exporting}>
            <Text style={[typography.body, { color: colors.text }]}>
              {t('settings.exportCards')}
            </Text>
            {exporting ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {t('settings.cardCount', { count: cardsList.length })}
              </Text>
            )}
          </Pressable>
          <Divider />
          <Pressable style={styles.row} onPress={handleImport} disabled={importing}>
            <Text style={[typography.body, { color: colors.text }]}>
              {t('settings.importCards')}
            </Text>
            {importing ? <ActivityIndicator size="small" color={colors.textSecondary} /> : null}
          </Pressable>
          <Divider />
          <Pressable style={styles.row} onPress={handleReplayTutorial}>
            <Text style={[typography.body, { color: colors.text }]}>
              {t('settings.replayTutorial')}
            </Text>
          </Pressable>
          <Divider />
          <Pressable style={styles.row} onPress={handleClearAll}>
            <Text style={[typography.body, { color: colors.danger }]}>
              {t('settings.deleteAll')}
            </Text>
          </Pressable>
        </Panel>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('settings.sectionAbout')}
        </Text>
        <Panel>
          <View style={styles.row}>
            <Text style={[typography.body, { color: colors.text }]}>Tesserone</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {t('settings.aboutVersion', { version: Constants.expoConfig?.version ?? '' })}
            </Text>
          </View>
          <Divider />
          <View style={styles.row}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {t('settings.aboutTagline')}
            </Text>
          </View>
          <Divider />
          <View style={styles.row}>
            <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
              {t('settings.aboutDisclaimer')}
            </Text>
          </View>
        </Panel>
      </ScrollView>

      <ActionBar>
        <Button title={t('common.done')} variant="primary" onPress={() => router.back()} style={styles.flex} />
      </ActionBar>

      <Sheet
        visible={languagePickerOpen}
        onClose={() => setLanguagePickerOpen(false)}
        title={t('settings.sectionLanguage')}
      >
        {LANGUAGE_VALUES.map((pref, idx) => (
          <React.Fragment key={pref}>
            {idx > 0 ? <Divider /> : null}
            <Pressable
              style={styles.row}
              onPress={() => {
                setLanguage(pref);
                setLanguagePickerOpen(false);
              }}
            >
              <Text style={[typography.body, { color: colors.text }]}>
                {languageLabel(pref)}
              </Text>
              {language === pref ? (
                <Text style={[typography.body, { color: colors.accent }]}>✓</Text>
              ) : null}
            </Pressable>
          </React.Fragment>
        ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontFamily: mono.bold,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: CHROME_RADIUS,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: CHROME_RADIUS - 1,
    alignItems: 'center',
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
