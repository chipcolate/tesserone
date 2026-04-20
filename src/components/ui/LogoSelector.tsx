import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, typography, textOnColor } from '../../theme';
import { getBrandLogo, getBrand, type BrandEntry } from '../../services/logos';

interface LogoSelectorProps {
  logoSlug?: string;
  customLogoUri?: string;
  cardName: string;
  cardColor: string;
  brandResults: BrandEntry[];
  onBrandSelect: (brand: BrandEntry) => void;
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
      <View style={styles.previewRow}>
        <View style={[styles.logoPreview, { backgroundColor: cardColor }]}>
          {logoSource ? (
            <Image source={logoSource} style={styles.logoImage} contentFit="contain" transition={150} />
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
