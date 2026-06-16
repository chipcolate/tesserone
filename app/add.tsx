import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { KeyboardAwareScrollView, type KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useCardsStore, nextSortIndex } from '../src/stores/cards';
import { useTheme, typography, CARD_COLORS, textOnColor, DEFAULT_CARD_COLOR } from '../src/theme';
import { CHROME_RADIUS } from '../src/theme/geometry';
import { mono } from '../src/theme/fonts';
import { BarcodeFormat, FidelityCard } from '../src/types';
import * as Haptics from 'expo-haptics';
import { mapBarcodeType, validateBarcode, fixScannedCode, BARCODE_FORMAT_OPTIONS } from '../src/services/scanner';
import { scanBarcodeFromImage } from '../src/services/imageScan';
import { searchBrands, getBrandColors, deleteCustomLogo } from '../src/services/logos';
import type { BrandEntry } from '../src/types';
import { LogoSelector } from '../src/components/ui/LogoSelector';
import { BrandResults } from '../src/components/ui/BrandResults';
import { Button } from '../src/components/ui/Button';
import { ActionBar } from '../src/components/ui/ActionBar';

type Mode = 'edit' | 'camera';
type ScanStatus = 'idle' | 'scanning' | 'notFound';

const ACTION_BAR_HEIGHT = 68;

export default function AddCardScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const cards = useCardsStore((s) => s.cards);
  const addCard = useCardsStore((s) => s.addCard);
  const [permission, requestPermission] = useCameraPermissions();
  const params = useLocalSearchParams<{ sharedImageUri?: string }>();

  const [mode, setMode] = useState<Mode>('edit');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [format, setFormat] = useState<BarcodeFormat>('EAN13');
  const [color, setColor] = useState(DEFAULT_CARD_COLOR);
  const [notes, setNotes] = useState('');
  const [logoSlug, setLogoSlug] = useState<string | undefined>();
  const [customLogoUri, setCustomLogoUri] = useState<string | undefined>();
  const [scanned, setScanned] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [pickedImageUri, setPickedImageUri] = useState<string | undefined>();
  const processingRef = useRef(false);
  const sharedHandledRef = useRef(false);
  const nameInputRef = useRef<TextInput>(null);

  const [brandResults, setBrandResults] = useState<BrandEntry[]>([]);
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);

  useEffect(() => {
    if (mode !== 'edit') return;
    const t = setTimeout(() => scrollRef.current?.flashScrollIndicators(), 400);
    return () => clearTimeout(t);
  }, [mode]);

  const handleNameChange = useCallback((text: string) => {
    setName(text);
    setBrandResults(searchBrands(text));
  }, []);

  const handleBrandSelect = useCallback((brand: BrandEntry) => {
    setName(brand.name);
    setLogoSlug(brand.slug);
    setCustomLogoUri((prev) => {
      deleteCustomLogo(prev);
      return undefined;
    });
    const brandColors = getBrandColors(brand.slug);
    if (brandColors) setColor(brandColors.primary);
    setBrandResults([]);
  }, []);

  const handleCustomLogoPick = useCallback((uri: string) => {
    setCustomLogoUri((prev) => {
      if (prev && prev !== uri) deleteCustomLogo(prev);
      return uri;
    });
    setLogoSlug(undefined);
    setBrandResults([]);
  }, []);

  const handleClearLogo = useCallback(() => {
    setLogoSlug(undefined);
    setCustomLogoUri((prev) => {
      deleteCustomLogo(prev);
      return undefined;
    });
    setBrandResults([]);
  }, []);

  const handleBarCodeScanned = useCallback(
    ({ type, data }: BarcodeScanningResult) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setScanned(true);

      const mappedFormat = mapBarcodeType(type);
      const fixed = fixScannedCode(data.trim(), mappedFormat);
      setCode(fixed.code);
      setFormat(fixed.format);
      setMode('edit');
    },
    []
  );

  const runImageScan = useCallback(
    async (uri: string) => {
      setMode('edit');
      setPickedImageUri(uri);
      setScanStatus('scanning');
      const result = await scanBarcodeFromImage(uri);
      if (result.kind === 'detected') {
        setCode(result.code);
        setFormat(result.format);
        setPickedImageUri(undefined);
        setScanStatus('idle');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (result.kind === 'notFound') {
        setScanStatus('notFound');
      } else {
        setScanStatus('idle');
        setPickedImageUri(undefined);
        Alert.alert(t('add.scanErrorTitle'), t('add.scanErrorBody'));
      }
    },
    [t]
  );

  useEffect(() => {
    if (sharedHandledRef.current) return;
    if (!params.sharedImageUri) return;
    sharedHandledRef.current = true;
    void runImageScan(params.sharedImageUri);
  }, [params.sharedImageUri, runImageScan]);

  const handleScan = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    processingRef.current = false;
    setScanned(false);
    setMode('camera');
  }, [permission, requestPermission]);

  const handlePick = useCallback(async () => {
    setMode('edit');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('add.photoPermissionDeniedTitle'), t('add.photoPermissionDeniedBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.uri) return;
    await runImageScan(asset.uri);
  }, [runImageScan, t]);

  const handleManual = useCallback(() => {
    setMode('edit');
    requestAnimationFrame(() => nameInputRef.current?.focus());
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert(t('add.missingNameTitle'), t('add.missingNameBody'));
      return;
    }
    if (!code.trim()) {
      Alert.alert(t('add.missingCodeTitle'), t('add.missingCodeBody'));
      return;
    }
    if (!validateBarcode(code.trim(), format)) {
      Alert.alert(t('add.invalidBarcodeTitle'), t('add.invalidBarcodeBody', { format }));
      return;
    }

    const now = new Date().toISOString();
    const card: FidelityCard = {
      id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      code: code.trim(),
      format,
      color,
      logoSlug,
      customLogoUri,
      notes: notes.trim() || undefined,
      sortIndex: nextSortIndex(cards),
      createdAt: now,
      updatedAt: now,
    };
    addCard(card);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [name, code, format, color, logoSlug, customLogoUri, notes, cards, addCard, t]);

  const renderActionTile = (label: string, onPress: () => void) => (
    <Pressable
      style={[styles.actionTile, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={[styles.actionTileLabel, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[typography.cardName, { color: colors.text }]}>{t('add.title')}</Text>
      </View>

      <View style={styles.actionsRow}>
        {renderActionTile(t('add.actionScan'), handleScan)}
        {renderActionTile(t('add.actionPick'), handlePick)}
        {renderActionTile(t('add.actionManual'), handleManual)}
      </View>

      {mode === 'camera' && permission?.granted ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: [
                'qr', 'ean13', 'ean8', 'code128', 'code39',
                'upc_a', 'upc_e', 'pdf417', 'aztec', 'datamatrix', 'itf14',
              ],
            }}
          />
          <View style={styles.scanOverlay}>
            <View style={styles.viewfinder} />
            <Text style={styles.scanHint}>{t('add.scanHint')}</Text>
          </View>
          <Pressable
            style={[styles.cameraBack, { top: insets.top + 12 }]}
            onPress={() => setMode('edit')}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          >
            <Text style={styles.cameraBackText}>✕</Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAwareScrollView
          ref={scrollRef}
          style={styles.form}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          bottomOffset={ACTION_BAR_HEIGHT + insets.bottom}
        >
          {scanStatus === 'scanning' && (
            <View style={[styles.scanBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[typography.body, { color: colors.text }]}>{t('add.scanningImage')}</Text>
            </View>
          )}
          {scanStatus === 'notFound' && pickedImageUri && (
            <View style={[styles.scanResultRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Image
                source={{ uri: pickedImageUri }}
                style={styles.thumbnail}
                accessibilityLabel={t('add.sharedImageLabel')}
              />
              <Text style={[typography.body, styles.scanResultText, { color: colors.text }]}>
                {t('add.scanNotFound')}
              </Text>
            </View>
          )}

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('add.labelName')}</Text>
          <TextInput
            ref={nameInputRef}
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={name}
            onChangeText={handleNameChange}
            placeholder={t('add.placeholderName')}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
            autoCorrect={false}
            spellCheck={false}
          />
          <BrandResults results={brandResults} selectedSlug={logoSlug} onSelect={handleBrandSelect} />

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('add.labelLogo')}</Text>
          <LogoSelector
            logoSlug={logoSlug}
            customLogoUri={customLogoUri}
            cardName={name}
            cardColor={color}
            onCustomLogoPick={handleCustomLogoPick}
            onClear={handleClearLogo}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('add.labelBarcode')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={code}
            onChangeText={setCode}
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
            <Svg
              pointerEvents="none"
              style={styles.formatFade}
              width={28}
              height="100%"
            >
              <Defs>
                <LinearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={colors.bg} stopOpacity="0" />
                  <Stop offset="1" stopColor={colors.bg} stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="28" height="100%" fill="url(#fade)" />
            </Svg>
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('add.labelColor')}</Text>
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

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('add.labelNotes')}</Text>
          <TextInput
            style={[styles.input, styles.notesInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('add.placeholderNotes')}
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
          />
        </KeyboardAwareScrollView>
      )}

      <ActionBar>
        <Button title={t('common.cancel')} variant="secondary" onPress={() => router.back()} style={styles.flex} />
        <Button title={t('add.save')} variant="primary" onPress={handleSave} style={styles.flex} />
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
  actionsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 10,
    marginTop: 16,
    marginBottom: 16,
  },
  actionTile: {
    flex: 1,
    height: 72,
    borderRadius: CHROME_RADIUS,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTileLabel: {
    fontFamily: mono.bold,
    fontSize: 14,
  },
  cameraWrap: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: CHROME_RADIUS,
    overflow: 'hidden',
    marginBottom: 20,
  },
  camera: { flex: 1 },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinder: {
    width: 260,
    height: 160,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: CHROME_RADIUS,
  },
  scanHint: {
    color: '#fff',
    fontFamily: mono.medium,
    fontSize: 14,
    marginTop: 16,
  },
  cameraBack: {
    position: 'absolute',
    left: 12,
    width: 40,
    height: 40,
    borderRadius: CHROME_RADIUS,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBackText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: mono.regular,
  },
  form: { flex: 1 },
  formContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  scanBanner: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: CHROME_RADIUS,
    borderWidth: 1,
    marginBottom: 12,
  },
  scanResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: CHROME_RADIUS,
    borderWidth: 1,
    marginBottom: 12,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: CHROME_RADIUS,
    backgroundColor: '#0006',
  },
  scanResultText: {
    flex: 1,
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
