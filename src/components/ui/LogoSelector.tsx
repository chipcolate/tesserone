import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useTheme, typography, textOnColor } from '../../theme';
import { getBrandLogo, getBrand, type BrandEntry } from '../../services/logos';

interface LogoSelectorProps {
  /** Currently selected brand slug. */
  logoSlug?: string;
  /** Currently selected custom logo URI. */
  customLogoUri?: string;
  /** Card name (used for initial fallback). */
  cardName: string;
  /** Card background color. */
  cardColor: string;
  /** Brand search results to display. */
  brandResults: BrandEntry[];
  /** Called when a brand is selected from results. */
  onBrandSelect: (brand: BrandEntry) => void;
  /** Called to clear the current logo. */
  onClear: () => void;
}

export function LogoSelector({
  logoSlug,
  customLogoUri,
  cardName,
  cardColor,
  brandResults,
  onBrandSelect,
  onClear,
}: LogoSelectorProps) {
  const { colors } = useTheme();

  const bundledLogo = logoSlug ? getBrandLogo(logoSlug) : undefined;
  const customLogo = customLogoUri ? { uri: customLogoUri } : undefined;
  const logoSource = customLogo ?? bundledLogo;
  const brand = logoSlug ? getBrand(logoSlug) : undefined;

  return (
    <View style={styles.container}>
      {/* Current logo preview */}
      <View style={styles.previewRow}>
        <View style={[styles.logoPreview, { backgroundColor: cardColor }]}>
          {logoSource ? (
            <Image source={logoSource} style={styles.logoImage} resizeMode="contain" />
          ) : (
            <Text style={[styles.initial, { color: textOnColor(cardColor) }]}>
              {cardName ? cardName.charAt(0).toUpperCase() : '?'}
            </Text>
          )}
        </View>
        <View style={styles.previewInfo}>
          <Text style={[typography.label, { color: colors.text }]} numberOfLines={1}>
            {brand?.name ?? (customLogoUri ? 'Custom logo' : 'No logo')}
          </Text>
          {(logoSlug || customLogoUri) && (
            <Pressable onPress={onClear} hitSlop={8}>
              <Text style={[typography.caption, { color: '#EF5350' }]}>Remove</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Brand search results */}
      {brandResults.length > 0 && (
        <View style={[styles.resultsList, { backgroundColor: colors.surface }]}>
          {brandResults.map((b) => (
            <Pressable key={b.slug} style={styles.resultRow} onPress={() => onBrandSelect(b)}>
              <View style={[styles.resultDot, { backgroundColor: b.primaryColor }]} />
              <Text style={[typography.label, { color: colors.text }]}>{b.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoPreview: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  logoImage: {
    width: 40,
    height: 40,
  },
  initial: {
    fontSize: 24,
    fontWeight: '800',
  },
  previewInfo: {
    flex: 1,
    gap: 2,
  },
  resultsList: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  resultDot: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
});
