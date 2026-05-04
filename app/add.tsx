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
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useCardsStore, nextSortIndex } from '../src/stores/cards';
import { useTheme, typography, CARD_COLORS, textOnColor, DEFAULT_CARD_COLOR } from '../src/theme';
import { BarcodeFormat, FidelityCard } from '../src/types';
import * as Haptics from 'expo-haptics';
import { mapBarcodeType, validateBarcode, fixScannedCode, BARCODE_FORMAT_OPTIONS } from '../src/services/scanner';
import { scanBarcodeFromImage } from '../src/services/imageScan';
import { searchBrands, getBrandColors, deleteCustomLogo } from '../src/services/logos';
import type { BrandEntry } from '../src/types';
import { LogoSelector } from '../src/components/ui/LogoSelector';

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
      style={[styles.actionTile, { backgroundColor: colors.surface }]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
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
            <View style={[styles.scanBanner, { backgroundColor: colors.surface }]}>
              <Text style={[typography.body, { color: colors.text }]}>{t('add.scanningImage')}</Text>
            </View>
          )}
          {scanStatus === 'notFound' && pickedImageUri && (
            <View style={[styles.scanResultRow, { backgroundColor: colors.surface }]}>
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
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            value={name}
            onChangeText={handleNameChange}
            placeholder={t('add.placeholderName')}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
            autoCorrect={false}
            spellCheck={false}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('add.labelLogo')}</Text>
          <LogoSelector
            logoSlug={logoSlug}
            customLogoUri={customLogoUri}
            cardName={name}
            cardColor={color}
            brandResults={brandResults}
            onBrandSelect={handleBrandSelect}
            onCustomLogoPick={handleCustomLogoPick}
            onClear={handleClearLogo}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('add.labelBarcode')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            value={code}
            onChangeText={setCode}
            placeholder={t('add.placeholderBarcode')}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('add.labelFormat')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formatRow}>
            {BARCODE_FORMAT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.formatChip,
                  { backgroundColor: format === opt.value ? colors.accent : colors.surface },
                ]}
                onPress={() => setFormat(opt.value)}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color: format === opt.value ? textOnColor(colors.accent) : colors.text,
                      fontWeight: format === opt.value ? '700' : '400',
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('add.labelColor')}</Text>
          <View style={styles.colorGrid}>
            {CARD_COLORS.map((c) => (
              <Pressable
                key={c}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  c === '#FFFFFF' && styles.colorLight,
                  color === c && styles.colorSelected,
                ]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('add.labelNotes')}</Text>
          <TextInput
            style={[styles.input, styles.notesInput, { backgroundColor: colors.surface, color: colors.text }]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('add.placeholderNotes')}
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
          />
        </KeyboardAwareScrollView>
      )}

      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
        >
          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{t('common.cancel')}</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.accent }]}
          onPress={handleSave}
        >
          <Text style={[typography.body, { color: '#fff', fontWeight: '700' }]}>{t('add.save')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  actionTile: {
    flex: 1,
    height: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraWrap: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 16,
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
    borderRadius: 12,
  },
  scanHint: {
    color: '#fff',
    fontSize: 14,
    marginTop: 16,
    fontWeight: '600',
  },
  form: { flex: 1 },
  formContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  scanBanner: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  scanResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#0006',
  },
  scanResultText: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  notesInput: {
    height: 80,
    paddingTop: 12,
  },
  formatRow: {
    flexGrow: 0,
    marginBottom: 4,
  },
  formatChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
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
    borderRadius: 18,
  },
  colorLight: {
    borderWidth: 1,
    borderColor: '#ccc',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
});
