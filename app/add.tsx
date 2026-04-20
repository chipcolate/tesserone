import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useCardsStore, nextSortIndex } from '../src/stores/cards';
import { useTheme, typography, CARD_COLORS, textOnColor, DEFAULT_CARD_COLOR } from '../src/theme';
import { BarcodeFormat, FidelityCard } from '../src/types';
import * as Haptics from 'expo-haptics';
import { mapBarcodeType, validateBarcode, fixScannedCode, BARCODE_FORMAT_OPTIONS } from '../src/services/scanner';
import { searchBrands, getBrandColors } from '../src/services/logos';
import type { BrandEntry } from '../src/types';
import { LogoSelector } from '../src/components/ui/LogoSelector';

type Tab = 'scan' | 'manual';

export default function AddCardScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { cards, addCard } = useCardsStore();
  const [permission, requestPermission] = useCameraPermissions();

  const [tab, setTab] = useState<Tab>('manual');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [format, setFormat] = useState<BarcodeFormat>('EAN13');
  const [color, setColor] = useState(DEFAULT_CARD_COLOR);
  const [notes, setNotes] = useState('');
  const [logoSlug, setLogoSlug] = useState<string | undefined>();
  const [scanned, setScanned] = useState(false);
  const processingRef = useRef(false);

  // Brand search results driven by name input
  const [brandResults, setBrandResults] = useState<BrandEntry[]>([]);

  const handleNameChange = useCallback((text: string) => {
    setName(text);
    setBrandResults(searchBrands(text));
  }, []);

  const handleBrandSelect = useCallback((brand: BrandEntry) => {
    setName(brand.name);
    setLogoSlug(brand.slug);
    const brandColors = getBrandColors(brand.slug);
    if (brandColors) setColor(brandColors.primary);
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
      setTab('manual');
    },
    []
  );

  const handleScanTab = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    processingRef.current = false;
    setScanned(false);
    setTab('scan');
  }, [permission, requestPermission]);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter a card name.');
      return;
    }
    if (!code.trim()) {
      Alert.alert('Missing code', 'Please enter or scan a barcode.');
      return;
    }
    if (!validateBarcode(code.trim(), format)) {
      Alert.alert('Invalid barcode', `The code doesn't match the ${format} format.`);
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
      notes: notes.trim() || undefined,
      sortIndex: nextSortIndex(cards),
      createdAt: now,
      updatedAt: now,
    };
    addCard(card);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [name, code, format, color, logoSlug, notes, cards, addCard]);

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[typography.cardName, { color: colors.text }]}>Add Card</Text>
      </View>

      {/* Tab switcher */}
      <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
        <Pressable
          style={[styles.tab, tab === 'scan' && { backgroundColor: colors.accent }]}
          onPress={handleScanTab}
        >
          <Text
            style={[
              typography.label,
              { color: tab === 'scan' ? textOnColor(colors.accent) : colors.text },
            ]}
          >
            Scan
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'manual' && { backgroundColor: colors.accent }]}
          onPress={() => setTab('manual')}
        >
          <Text
            style={[
              typography.label,
              { color: tab === 'manual' ? textOnColor(colors.accent) : colors.text },
            ]}
          >
            Manual
          </Text>
        </Pressable>
      </View>

      {tab === 'scan' && permission?.granted ? (
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
            <Text style={styles.scanHint}>Point at a barcode</Text>
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.form}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Card Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            value={name}
            onChangeText={handleNameChange}
            placeholder="e.g. Esselunga, IKEA"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
          />

          {/* Logo */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Logo</Text>
          <LogoSelector
            logoSlug={logoSlug}
            cardName={name}
            cardColor={color}
            brandResults={brandResults}
            onBrandSelect={handleBrandSelect}
            onClear={() => { setLogoSlug(undefined); setBrandResults([]); }}
          />

          {/* Barcode */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Barcode</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            value={code}
            onChangeText={setCode}
            placeholder="Enter barcode number"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Format picker */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Format</Text>
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

          {/* Color picker */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Color</Text>
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

          {/* Notes */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput, { backgroundColor: colors.surface, color: colors.text }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes"
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
      )}

      {/* Bottom action buttons */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
        >
          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.accent }]}
          onPress={handleSave}
        >
          <Text style={[typography.body, { color: '#fff', fontWeight: '700' }]}>Save Card</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
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
