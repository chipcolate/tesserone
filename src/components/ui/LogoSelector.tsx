import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useTheme, typography, textOnColor } from '../../theme';
import { CHROME_RADIUS } from '../../theme/geometry';
import { mono } from '../../theme/fonts';
import {
  getBrandLogo,
  getBrand,
  pickCustomLogoFromLibrary,
  customLogoSource,
} from '../../services/logos';
import { alertPermissionBlocked } from '../../services/permissions';

interface LogoSelectorProps {
  logoSlug?: string;
  customLogoUri?: string;
  cardName: string;
  cardColor: string;
  onCustomLogoPick: (ref: string) => void;
  onClear: () => void;
}

export function LogoSelector({
  logoSlug,
  customLogoUri,
  cardName,
  cardColor,
  onCustomLogoPick,
  onClear,
}: LogoSelectorProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);

  const bundledLogo = logoSlug ? getBrandLogo(logoSlug) : undefined;
  const customLogo = customLogoSource(customLogoUri);
  const logoSource = customLogo ?? bundledLogo;
  const brand = logoSlug ? getBrand(logoSlug) : undefined;
  const hasAnyLogo = Boolean(logoSlug || customLogoUri);

  const handleUpload = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const result = await pickCustomLogoFromLibrary();
      switch (result.kind) {
        case 'picked':
          onCustomLogoPick(result.ref);
          break;
        case 'permissionDenied':
          if (!result.canAskAgain) {
            alertPermissionBlocked(
              t,
              t('logoSelector.photoPermissionDeniedTitle'),
              t('logoSelector.photoPermissionDeniedBody')
            );
          }
          break;
        case 'error':
          Alert.alert(t('logoSelector.photoPickErrorTitle'), result.message);
          break;
        case 'canceled':
          break;
      }
    } finally {
      setPicking(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.previewRow}>
        <View style={[styles.logoPreview, { backgroundColor: cardColor, borderColor: colors.border }]}>
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
            {brand?.name ?? (customLogoUri ? t('logoSelector.customLogo') : t('logoSelector.noLogo'))}
          </Text>
          {hasAnyLogo && (
            <Pressable onPress={onClear} hitSlop={8}>
              <Text style={[typography.caption, { color: colors.danger }]}>{t('common.remove')}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <Pressable
        onPress={handleUpload}
        disabled={picking}
        style={[
          styles.uploadButton,
          { backgroundColor: colors.surface, borderColor: colors.border, opacity: picking ? 0.6 : 1 },
        ]}
      >
        <Text style={[styles.uploadLabel, { color: colors.text }]}>
          {customLogoUri
            ? t('logoSelector.replacePhoto')
            : t('logoSelector.uploadPhoto')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoPreview: {
    width: 48,
    height: 48,
    borderRadius: CHROME_RADIUS,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  logoImage: {
    width: 40,
    height: 40,
  },
  initial: {
    fontFamily: mono.extrabold,
    fontSize: 22,
  },
  previewInfo: {
    flex: 1,
    gap: 2,
  },
  uploadButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: CHROME_RADIUS,
    borderWidth: 1,
  },
  uploadLabel: {
    fontFamily: mono.medium,
    fontSize: 14,
  },
});
