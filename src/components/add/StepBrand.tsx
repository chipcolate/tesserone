import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useTranslation } from 'react-i18next';
import { useTheme, typography, textOnColor } from '../../theme';
import { CHROME_RADIUS } from '../../theme/geometry';
import { mono } from '../../theme/fonts';
import { searchBrands, getBrandLogo } from '../../services/logos';
import { BrandEntry } from '../../types';
import { LogoSelector } from '../ui/LogoSelector';

interface StepBrandProps {
  name: string;
  logoSlug?: string;
  customLogoUri?: string;
  color: string;
  onNameChange: (name: string) => void;
  onBrandSelect: (brand: BrandEntry) => void;
  onCustomLogoPick: (ref: string) => void;
  onClearLogo: () => void;
  bottomOffset: number;
}

/**
 * Step 2 of the add-card wizard: a first-class, always-visible brand search
 * (the previous inline dropdown was easy to miss), with logo thumbnails — plus
 * an explicit "not listed?" fallback to set a custom name + logo by hand.
 */
export function StepBrand({
  name,
  logoSlug,
  customLogoUri,
  color,
  onNameChange,
  onBrandSelect,
  onCustomLogoPick,
  onClearLogo,
  bottomOffset,
}: StepBrandProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BrandEntry[]>([]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    setResults(searchBrands(text));
  };

  const handleSelect = (brand: BrandEntry) => {
    onBrandSelect(brand);
    setQuery('');
    setResults([]);
  };

  return (
    <KeyboardAwareScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      bottomOffset={bottomOffset}
    >
      <Text style={[styles.label, styles.firstLabel, { color: colors.textSecondary }]}>
        {t('add.brandSearchLabel')}
      </Text>
      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>⌕</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={query}
          onChangeText={handleQueryChange}
          placeholder={t('add.brandSearchPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          autoFocus
        />
      </View>

      {query.trim().length > 0 && results.length === 0 ? (
        <Text style={[typography.caption, styles.noResults, { color: colors.textSecondary }]}>
          {t('add.brandNoResults')}
        </Text>
      ) : null}

      {results.length > 0 && (
        <View style={[styles.results, { borderColor: colors.border }]}>
          {results.map((b, idx) => {
            const selected = b.slug === logoSlug;
            const logo = getBrandLogo(b.slug);
            return (
              <Pressable
                key={b.slug}
                style={[
                  styles.resultRow,
                  idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                  { backgroundColor: selected ? colors.bg : colors.surface },
                ]}
                onPress={() => handleSelect(b)}
                accessibilityRole="button"
              >
                <View style={[styles.logoTile, { backgroundColor: b.primaryColor, borderColor: colors.border }]}>
                  {logo ? (
                    <Image source={logo} style={styles.logoImage} contentFit="contain" transition={120} />
                  ) : (
                    <Text style={[styles.logoInitial, { color: textOnColor(b.primaryColor) }]}>
                      {b.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={[typography.label, styles.resultName, { color: colors.text }]} numberOfLines={1}>
                  {b.name}
                </Text>
                {selected ? <Text style={[typography.label, { color: colors.accent }]}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={[styles.divider, { borderTopColor: colors.border }]} />

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('add.brandCustomTitle')}</Text>
      <Text style={[typography.caption, styles.customHint, { color: colors.textSecondary }]}>
        {t('add.brandCustomHint')}
      </Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={name}
        onChangeText={onNameChange}
        placeholder={t('add.placeholderName')}
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="words"
        autoCorrect={false}
        spellCheck={false}
      />

      <View style={styles.logoSelector}>
        <LogoSelector
          logoSlug={logoSlug}
          customLogoUri={customLogoUri}
          cardName={name}
          cardColor={color}
          onCustomLogoPick={onCustomLogoPick}
          onClear={onClearLogo}
        />
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  label: {
    fontFamily: mono.bold,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 16,
  },
  firstLabel: {
    marginTop: 0,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: CHROME_RADIUS,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchIcon: {
    fontSize: 22,
    fontFamily: mono.regular,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: mono.regular,
    height: '100%',
  },
  noResults: {
    marginTop: 10,
  },
  results: {
    marginTop: 12,
    borderRadius: CHROME_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logoTile: {
    width: 40,
    height: 40,
    borderRadius: CHROME_RADIUS,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  logoInitial: {
    fontFamily: mono.extrabold,
    fontSize: 18,
  },
  resultName: {
    flex: 1,
  },
  divider: {
    borderTopWidth: 1,
    marginTop: 24,
  },
  customHint: {
    marginTop: -2,
    marginBottom: 10,
  },
  input: {
    height: 48,
    borderRadius: CHROME_RADIUS,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: mono.regular,
  },
  logoSelector: {
    marginTop: 16,
  },
});
