import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { FidelityCard } from '../../types';
import { getBrandLogo, resolveCardColor } from '../../services/logos';
import { textOnColor, typography } from '../../theme';

interface CardFaceProps {
  card: FidelityCard;
}

/**
 * Front face of a wallet card. Renders:
 *   1. A bundled brand logo (via logoSlug) if available
 *   2. A user-uploaded logo (via customLogoUri) if set
 *   3. A typographic name-initial fallback otherwise
 *
 * The background color is taken from the card. Text/logo colors adapt
 * via textOnColor() for legibility.
 */
export const CardFace = React.memo(function CardFace({ card }: CardFaceProps) {
  const bg = resolveCardColor(card.color, card.logoSlug);
  const fg = textOnColor(bg);

  const bundledLogo = card.logoSlug ? getBrandLogo(card.logoSlug) : undefined;
  const customLogo = card.customLogoUri ? { uri: card.customLogoUri } : undefined;
  const logoSource = customLogo ?? bundledLogo;

  return (
    <View style={[styles.face, { backgroundColor: bg }]}>
      {logoSource ? (
        <View style={styles.logoWrap}>
          <Image
            source={logoSource}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel={`${card.name} logo`}
          />
        </View>
      ) : (
        <Text style={[styles.initial, { color: fg }]}>
          {card.name.charAt(0).toUpperCase()}
        </Text>
      )}
      <View>
        <Text style={[typography.cardName, styles.name, { color: fg }]} numberOfLines={1}>
          {card.name}
        </Text>
        {card.notes ? (
          <Text style={[typography.caption, { color: fg, opacity: 0.7, marginTop: 4 }]} numberOfLines={2}>
            {card.notes}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  face: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'space-between',
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
  initial: {
    fontSize: 64,
    fontWeight: '800',
    lineHeight: 72,
  },
  name: {
    marginTop: 'auto',
  },
});
