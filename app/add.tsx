import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useCardsStore, nextSortIndex } from '../src/stores/cards';
import { useTheme, DEFAULT_CARD_COLOR } from '../src/theme';
import { CHROME_RADIUS } from '../src/theme/geometry';
import { mono } from '../src/theme/fonts';
import { BarcodeFormat, FidelityCard, BrandEntry } from '../src/types';
import { mapBarcodeType, validateBarcode, fixScannedCode } from '../src/services/scanner';
import { scanBarcodeFromImage } from '../src/services/imageScan';
import { getBrandColors, deleteCustomLogo } from '../src/services/logos';
import { alertPermissionBlocked } from '../src/services/permissions';
import { Button } from '../src/components/ui/Button';
import { ActionBar } from '../src/components/ui/ActionBar';
import { WizardProgress } from '../src/components/add/WizardProgress';
import { StepBarcode, type ScanStatus } from '../src/components/add/StepBarcode';
import { StepBrand } from '../src/components/add/StepBrand';
import { StepFinish } from '../src/components/add/StepFinish';

type Step = 'barcode' | 'brand' | 'finish';
const STEP_ORDER: Step[] = ['barcode', 'brand', 'finish'];

const ACTION_BAR_HEIGHT = 68;

export default function AddCardScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const cards = useCardsStore((s) => s.cards);
  const addCard = useCardsStore((s) => s.addCard);
  const [permission, requestPermission] = useCameraPermissions();
  const params = useLocalSearchParams<{ sharedImageUri?: string }>();

  const [step, setStep] = useState<Step>('barcode');
  const [cameraOpen, setCameraOpen] = useState(false);

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

  const stepIndex = STEP_ORDER.indexOf(step);
  const bottomOffset = ACTION_BAR_HEIGHT + insets.bottom;

  const handleBrandSelect = useCallback((brand: BrandEntry) => {
    setName(brand.name);
    setLogoSlug(brand.slug);
    setCustomLogoUri((prev) => {
      deleteCustomLogo(prev);
      return undefined;
    });
    const brandColors = getBrandColors(brand.slug);
    if (brandColors) setColor(brandColors.primary);
  }, []);

  const handleCustomLogoPick = useCallback((uri: string) => {
    setCustomLogoUri((prev) => {
      if (prev && prev !== uri) deleteCustomLogo(prev);
      return uri;
    });
    setLogoSlug(undefined);
  }, []);

  const handleClearLogo = useCallback(() => {
    setLogoSlug(undefined);
    setCustomLogoUri((prev) => {
      deleteCustomLogo(prev);
      return undefined;
    });
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
      setCameraOpen(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    []
  );

  const runImageScan = useCallback(
    async (uri: string) => {
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
      if (!result.granted) {
        if (!result.canAskAgain) {
          alertPermissionBlocked(
            t,
            t('add.cameraPermissionBlockedTitle'),
            t('add.cameraPermissionBlockedBody')
          );
        }
        return;
      }
    }
    processingRef.current = false;
    setScanned(false);
    setCameraOpen(true);
  }, [permission, requestPermission, t]);

  const handlePick = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) {
        alertPermissionBlocked(
          t,
          t('add.photoPermissionDeniedTitle'),
          t('add.photoPermissionDeniedBody')
        );
      }
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

  const handleSave = useCallback(() => {
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
  }, [name, code, format, color, logoSlug, customLogoUri, notes, cards, addCard]);

  const canAdvance =
    step === 'barcode'
      ? code.trim().length > 0
      : step === 'brand'
        ? name.trim().length > 0
        : true;

  const handleBack = useCallback(() => {
    if (step === 'barcode') {
      router.back();
    } else {
      setStep(STEP_ORDER[stepIndex - 1]);
    }
  }, [step, stepIndex]);

  const handleNext = useCallback(() => {
    if (step === 'barcode') {
      if (!validateBarcode(code.trim(), format)) {
        Alert.alert(t('add.invalidBarcodeTitle'), t('add.invalidBarcodeBody', { format }));
        return;
      }
      setStep('brand');
    } else if (step === 'brand') {
      setStep('finish');
    } else {
      handleSave();
    }
  }, [step, code, format, t, handleSave]);

  const previewCard = useMemo<FidelityCard>(
    () => ({
      id: 'preview',
      name: name.trim() || t('card.previewPlaceholder'),
      code: code.trim(),
      format,
      color,
      logoSlug,
      customLogoUri,
      notes: notes.trim() || undefined,
      sortIndex: 0,
      createdAt: '',
      updatedAt: '',
    }),
    [name, code, format, color, logoSlug, customLogoUri, notes, t]
  );

  const stepMeta: Record<Step, { title: string; subtitle: string }> = {
    barcode: { title: t('add.stepBarcodeTitle'), subtitle: t('add.stepBarcodeSubtitle') },
    brand: { title: t('add.stepBrandTitle'), subtitle: t('add.stepBrandSubtitle') },
    finish: { title: t('add.stepReviewTitle'), subtitle: t('add.stepReviewSubtitle') },
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <WizardProgress
        stepIndex={stepIndex}
        total={STEP_ORDER.length}
        title={stepMeta[step].title}
        subtitle={stepMeta[step].subtitle}
      />

      <View style={styles.flex}>
        {step === 'barcode' && (
          <StepBarcode
            code={code}
            format={format}
            onCodeChange={setCode}
            onFormatChange={setFormat}
            onScanPress={handleScan}
            onPhotoPress={handlePick}
            scanStatus={scanStatus}
            pickedImageUri={pickedImageUri}
            bottomOffset={bottomOffset}
          />
        )}
        {step === 'brand' && (
          <StepBrand
            name={name}
            logoSlug={logoSlug}
            customLogoUri={customLogoUri}
            color={color}
            onNameChange={setName}
            onBrandSelect={handleBrandSelect}
            onCustomLogoPick={handleCustomLogoPick}
            onClearLogo={handleClearLogo}
            bottomOffset={bottomOffset}
          />
        )}
        {step === 'finish' && (
          <StepFinish
            previewCard={previewCard}
            color={color}
            notes={notes}
            onColorChange={setColor}
            onNotesChange={setNotes}
            bottomOffset={bottomOffset}
          />
        )}
      </View>

      <ActionBar>
        <Button
          title={step === 'barcode' ? t('common.cancel') : t('common.back')}
          variant="secondary"
          onPress={handleBack}
          style={styles.flex}
        />
        <Button
          title={step === 'finish' ? t('add.save') : t('common.next')}
          variant="primary"
          onPress={handleNext}
          disabled={!canAdvance}
          style={styles.flex}
        />
      </ActionBar>

      {cameraOpen && permission?.granted && (
        <View style={[styles.cameraOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: [
                'qr', 'ean13', 'ean8', 'code128', 'code39',
                'upc_a', 'upc_e', 'pdf417', 'aztec', 'datamatrix', 'itf14',
              ],
            }}
          />
          <View style={styles.scanOverlay} pointerEvents="none">
            <View style={styles.viewfinder} />
            <Text style={styles.scanHint}>{t('add.scanHint')}</Text>
          </View>
          <Pressable
            style={[styles.cameraBack, { top: insets.top + 12 }]}
            onPress={() => setCameraOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          >
            <Text style={styles.cameraBackText}>✕</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
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
});
