import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { FidelityCard } from '../../types';
import { getBrandLogo, resolveCardColor, customLogoSource } from '../../services/logos';
import { textOnColor } from '../../theme';

interface CardFaceProps {
  card: FidelityCard;
}

export const CardFace = React.memo(function CardFace({ card }: CardFaceProps) {
  const bg = resolveCardColor(card.color, card.logoSlug);
  const fg = textOnColor(bg);

  const bundledLogo = card.logoSlug ? getBrandLogo(card.logoSlug) : undefined;
  const customLogo = customLogoSource(card.customLogoUri);
  const logoSource = customLogo ?? bundledLogo;

  return (
    <View style={[styles.face, { backgroundColor: bg }]}>
      {logoSource ? (
        <View style={styles.logoWrap}>
          <Image
            source={logoSource}
            style={styles.logo}
            contentFit="contain"
            contentPosition="left center"
            transition={150}
            accessibilityLabel={`${card.name} logo`}
          />
        </View>
      ) : (
        <Text style={[styles.fallbackName, { color: fg }]} numberOfLines={2}>
          {card.name}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  face: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
  logoWrap: {
    height: 64,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  logo: {
    height: 48,
    width: 160,
  },
  fallbackName: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
});
