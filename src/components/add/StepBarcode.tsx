import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Image } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme, typography, textOnColor } from '../../theme';
import { CHROME_RADIUS } from '../../theme/geometry';
import { mono } from '../../theme/fonts';
import { BARCODE_FORMAT_OPTIONS } from '../../services/scanner';
import { BarcodeFormat } from '../../types';

export type ScanStatus = 'idle' | 'scanning' | 'notFound';

interface StepBarcodeProps {
  code: string;
  format: BarcodeFormat;
  onCodeChange: (code: string) => void;
  onFormatChange: (format: BarcodeFormat) => void;
  onScanPress: () => void;
  onPhotoPress: () => void;
  scanStatus: ScanStatus;
  pickedImageUri?: string;
  bottomOffset: number;
}

/**
 * Step 1 of the add-card wizard. A method chooser (scan / photo / type) up top;
 * below it, the barcode value + format become visible once a code exists or the
 * user opts to type one in — which also doubles as the confirmation surface
 * after a scan.
 */
export function StepBarcode({
  code,
  format,
  onCodeChange,
  onFormatChange,
  onScanPress,
  onPhotoPress,
  scanStatus,
  pickedImageUri,
  bottomOffset,
}: StepBarcodeProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [manualOpen, setManualOpen] = useState(false);
  const codeInputRef = useRef<TextInput>(null);

  const showEntry = manualOpen || code.length > 0;

  const openManual = () => {
    setManualOpen(true);
    requestAnimationFrame(() => codeInputRef.current?.focus());
  };

  const methods: { key: string; title: string; hint: string; onPress: () => void }[] = [
    { key: 'scan', title: t('add.methodScanTitle'), hint: t('add.methodScanHint'), onPress: onScanPress },
    { key: 'photo', title: t('add.methodPhotoTitle'), hint: t('add.methodPhotoHint'), onPress: onPhotoPress },
    { key: 'type', title: t('add.methodTypeTitle'), hint: t('add.methodTypeHint'), onPress: openManual },
  ];

  return (
    <KeyboardAwareScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      bottomOffset={bottomOffset}
    >
      <View style={styles.methods}>
        {methods.map((m) => (
          <Pressable
            key={m.key}
            style={[styles.methodTile, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={m.onPress}
            accessibilityRole="button"
          >
            <Text style={[styles.methodTitle, { color: colors.text }]}>{m.title}</Text>
            <Text style={[typography.caption, styles.methodHint, { color: colors.textSecondary }]}>
              {m.hint}
            </Text>
          </Pressable>
        ))}
      </View>

      {scanStatus === 'scanning' && (
        <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typography.body, { color: colors.text }]}>{t('add.scanningImage')}</Text>
        </View>
      )}
      {scanStatus === 'notFound' && pickedImageUri && (
        <View style={[styles.resultRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Image
            source={{ uri: pickedImageUri }}
            style={styles.thumbnail}
            accessibilityLabel={t('add.sharedImageLabel')}
          />
          <Text style={[typography.body, styles.resultText, { color: colors.text }]}>
            {t('add.scanNotFound')}
          </Text>
        </View>
      )}

      {showEntry && (
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('add.labelBarcode')}</Text>
          <TextInput
            ref={codeInputRef}
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={code}
            onChangeText={onCodeChange}
            placeholder={t('add.placeholderBarcode')}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('add.labelFormat')}</Text>
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
                  onPress={() => onFormatChange(opt.value)}
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
        </View>
      )}
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
  methods: {
    gap: 10,
  },
  methodTile: {
    minHeight: 64,
    borderRadius: CHROME_RADIUS,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  methodTitle: {
    fontFamily: mono.bold,
    fontSize: 16,
  },
  methodHint: {
    marginTop: 2,
  },
  banner: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: CHROME_RADIUS,
    borderWidth: 1,
    marginTop: 16,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: CHROME_RADIUS,
    borderWidth: 1,
    marginTop: 16,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: CHROME_RADIUS,
    backgroundColor: '#0006',
  },
  resultText: {
    flex: 1,
  },
  label: {
    fontFamily: mono.bold,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 24,
  },
  input: {
    height: 48,
    borderRadius: CHROME_RADIUS,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: mono.regular,
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
});
