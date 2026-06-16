import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView, type KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useCardsStore } from '../../src/stores/cards';
import { useTheme, typography, CARD_COLORS, textOnColor } from '../../src/theme';
import { CHROME_RADIUS, CARD_RADIUS } from '../../src/theme/geometry';
import { mono } from '../../src/theme/fonts';
import { BarcodeFormat, BrandEntry } from '../../src/types';
import {
  searchBrands,
  getBrandColors,
  deleteCustomLogo,
  isCustomLogoRef,
} from '../../src/services/logos';
import { BARCODE_FORMAT_OPTIONS } from '../../src/services/scanner';
import { LogoSelector } from '../../src/components/ui/LogoSelector';
import { BrandResults } from '../../src/components/ui/BrandResults';
import { Button } from '../../src/components/ui/Button';
import { ActionBar } from '../../src/components/ui/ActionBar';
import { useToast } from '../../src/components/ui/Toast';
import { shareCard } from '../../src/services/importExport';
import { formatDate } from '../../src/i18n/format';

const ACTION_BAR_HEIGHT = 68;

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const cards = useCardsStore((s) => s.cards);
  const updateCard = useCardsStore((s) => s.updateCard);
  const removeCard = useCardsStore((s) => s.removeCard);
  const addCard = useCardsStore((s) => s.addCard);
  const showToast = useToast();

  const card = cards[id];

  const [name, setName] = useState(card?.name ?? '');
  const [code, setCode] = useState(card?.code ?? '');
  const [format, setFormat] = useState<BarcodeFormat>(card?.format ?? 'CODE128');
  const [color, setColor] = useState(card?.color ?? '#42A5F5');
  const [notes, setNotes] = useState(card?.notes ?? '');
  const [logoSlug, setLogoSlug] = useState<string | undefined>(card?.logoSlug);
  const [customLogoUri, setCustomLogoUri] = useState<string | undefined>(card?.customLogoUri);
  const originalCustomLogoUriRef = useRef<string | undefined>(card?.customLogoUri);
  const [brandResults, setBrandResults] = useState<BrandEntry[]>(
    () => (!card?.logoSlug && card?.name) ? searchBrands(card.name) : []
  );
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);

  // Delete a draft custom-logo file unless it's the originally persisted one.
  const discardDraftIfEphemeral = useCallback((ref: string | undefined) => {
    if (!isCustomLogoRef(ref)) return;
    if (ref === originalCustomLogoUriRef.current) return;
    deleteCustomLogo(ref);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.flashScrollIndicators(), 400);
    return () => clearTimeout(t);
  }, []);

  if (!card) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 100 }]}>
          {t('card.notFound')}
        </Text>
      </View>
    );
  }

  const handleNameChange = (text: string) => {
    setName(text);
    setBrandResults(searchBrands(text));
  };

  const handleBrandSelect = (brand: BrandEntry) => {
    setName(brand.name);
    setLogoSlug(brand.slug);
    setCustomLogoUri((prev) => {
      discardDraftIfEphemeral(prev);
      return undefined;
    });
    const brandColors = getBrandColors(brand.slug);
    if (brandColors) setColor(brandColors.primary);
    setBrandResults([]);
  };

  const handleCustomLogoPick = (uri: string) => {
    setCustomLogoUri((prev) => {
      if (prev && prev !== uri) discardDraftIfEphemeral(prev);
      return uri;
    });
    setLogoSlug(undefined);
    setBrandResults([]);
  };

  const handleClearLogo = () => {
    setLogoSlug(undefined);
    setCustomLogoUri((prev) => {
      discardDraftIfEphemeral(prev);
      return undefined;
    });
    setBrandResults([]);
  };

  const handleShare = async () => {
    const result = await shareCard(card);
    if (!result.success && result.error) {
      Alert.alert(t('card.shareFailed'), result.error);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t('card.missingNameTitle'), t('card.missingNameBody'));
      return;
    }
    const prevUri = originalCustomLogoUriRef.current;
    if (isCustomLogoRef(prevUri) && prevUri !== customLogoUri) {
      deleteCustomLogo(prevUri);
    }
    updateCard(id, {
      name: name.trim(),
      code: code.trim(),
      format,
      color,
      logoSlug,
      customLogoUri,
      notes: notes.trim() || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handleDelete = () => {
    // Snapshot the persisted card so the undo toast can fully restore it
    // (removeCard now leaves the logo file in place for exactly this reason).
    const snapshot = card;
    // Any unsaved draft logo picked during this edit session is ephemeral.
    discardDraftIfEphemeral(customLogoUri);
    removeCard(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    router.back();
    showToast({
      message: t('card.deletedToast', { name: snapshot.name, defaultValue: `Deleted ${snapshot.name}` }),
      actionLabel: t('common.undo', { defaultValue: 'Undo' }),
      onAction: () => addCard(snapshot),
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[typography.cardName, { color: colors.text }]}>{t('card.title')}</Text>
      </View>

      <View style={[styles.preview, { backgroundColor: color }]}>
        <Text style={[typography.title, { color: textOnColor(color) }]} numberOfLines={1}>
          {name || t('card.previewPlaceholder')}
        </Text>
        {code ? (
          <Text style={[typography.barcode, { color: textOnColor(color), opacity: 0.7 }]} numberOfLines={1}>
            {code}
          </Text>
        ) : null}
      </View>

      <KeyboardAwareScrollView
        ref={scrollRef}
        style={styles.form}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bottomOffset={ACTION_BAR_HEIGHT + insets.bottom}
      >
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('card.labelName')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          value={name}
          onChangeText={handleNameChange}
          placeholder={t('card.placeholderName')}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="words"
          autoCorrect={false}
          spellCheck={false}
        />
        <BrandResults results={brandResults} selectedSlug={logoSlug} onSelect={handleBrandSelect} />

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('card.labelLogo')}</Text>
        <LogoSelector
          logoSlug={logoSlug}
          customLogoUri={customLogoUri}
          cardName={name}
          cardColor={color}
          onCustomLogoPick={handleCustomLogoPick}
          onClear={handleClearLogo}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('card.labelBarcode')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          value={code}
          onChangeText={setCode}
          placeholder={t('card.placeholderBarcode')}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('card.labelFormat')}</Text>
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formatRow}>
            {BARCODE_FORMAT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.formatChip,
                  {
                    backgroundColor: format === opt.value ? colors.accent : colors.surface,
                    borderColor: format === opt.value ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => setFormat(opt.value)}
              >
                <Text
                  style={{
                    fontFamily: format === opt.value ? mono.bold : mono.regular,
                    fontSize: 12,
                    color: format === opt.value ? textOnColor(colors.accent) : colors.text,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Svg pointerEvents="none" style={styles.formatFade} width={28} height="100%">
            <Defs>
              <LinearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={colors.bg} stopOpacity="0" />
                <Stop offset="1" stopColor={colors.bg} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="28" height="100%" fill="url(#fade)" />
          </Svg>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('card.labelColor')}</Text>
        <View style={styles.colorGrid}>
          {CARD_COLORS.map((c) => (
            <Pressable
              key={c}
              style={[
                styles.colorDot,
                { backgroundColor: c, borderColor: colors.border },
                color === c && { borderColor: colors.text, borderWidth: 3 },
              ]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('card.labelNotes')}</Text>
        <TextInput
          style={[styles.input, styles.notesInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('card.placeholderNotes')}
          placeholderTextColor={colors.textSecondary}
          multiline
          textAlignVertical="top"
        />

        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 16 }]}>
          {t('card.timestamps', {
            created: formatDate(card.createdAt),
            updated: formatDate(card.updatedAt),
          })}
        </Text>

        <Button
          title={t('card.share')}
          variant="ghost"
          onPress={handleShare}
          style={styles.shareButton}
        />
      </KeyboardAwareScrollView>

      <ActionBar>
        <Button title={t('common.delete')} variant="danger" onPress={handleDelete} />
        <View style={styles.flex} />
        <Button title={t('common.cancel')} variant="secondary" onPress={() => router.back()} />
        <Button title={t('common.save')} variant="primary" onPress={handleSave} />
      </ActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  preview: {
    marginHorizontal: 20,
    marginTop: 12,
    height: 120,
    borderRadius: CARD_RADIUS,
    padding: 20,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  form: { flex: 1 },
  formContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  label: {
    fontFamily: mono.bold,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    height: 48,
    borderRadius: CHROME_RADIUS,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: mono.regular,
  },
  notesInput: {
    height: 80,
    paddingTop: 12,
  },
  shareButton: {
    marginTop: 24,
  },
  formatRow: {
    flexGrow: 0,
    marginBottom: 4,
  },
  formatFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
  },
  formatChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CHROME_RADIUS,
    borderWidth: 1,
    marginRight: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: CHROME_RADIUS,
    borderWidth: 1,
  },
});
