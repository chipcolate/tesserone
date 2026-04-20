import React, { useEffect, useRef, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useCardsStore } from '../../src/stores/cards';
import { useTheme, typography, CARD_COLORS, textOnColor } from '../../src/theme';
import { BarcodeFormat, BrandEntry } from '../../src/types';
import { searchBrands, getBrandColors } from '../../src/services/logos';
import { BARCODE_FORMAT_OPTIONS } from '../../src/services/scanner';
import { LogoSelector } from '../../src/components/ui/LogoSelector';

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { cards, updateCard, removeCard } = useCardsStore();

  const card = cards[id!];

  const [name, setName] = useState(card?.name ?? '');
  const [code, setCode] = useState(card?.code ?? '');
  const [format, setFormat] = useState<BarcodeFormat>(card?.format ?? 'CODE128');
  const [color, setColor] = useState(card?.color ?? '#42A5F5');
  const [notes, setNotes] = useState(card?.notes ?? '');
  const [logoSlug, setLogoSlug] = useState<string | undefined>(card?.logoSlug);
  const [brandResults, setBrandResults] = useState<BrandEntry[]>(
    () => (!card?.logoSlug && card?.name) ? searchBrands(card.name) : []
  );
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.flashScrollIndicators(), 400);
    return () => clearTimeout(t);
  }, []);

  const handleNotesFocus = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
  };

  if (!card) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 100 }]}>
          Card not found
        </Text>
      </View>
    );
  }

  const handleNameChange = (text: string) => {
    setName(text);
    setBrandResults(searchBrands(text));
  };

  const handleBrandSelect = (brand: BrandEntry) => {
    setName(brand.name);
    setLogoSlug(brand.slug);
    const brandColors = getBrandColors(brand.slug);
    if (brandColors) setColor(brandColors.primary);
    setBrandResults([]);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Card name is required.');
      return;
    }
    updateCard(id!, {
      name: name.trim(),
      code: code.trim(),
      format,
      color,
      logoSlug,
      notes: notes.trim() || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert('Delete Card', `Remove "${card.name}" from your wallet?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeCard(id!);
          router.back();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={[typography.cardName, { color: colors.text }]}>Edit Card</Text>
      </View>

      <View style={[styles.preview, { backgroundColor: color }]}>
        <Text style={[typography.title, { color: textOnColor(color) }]} numberOfLines={1}>
          {name || 'Card Name'}
        </Text>
        {code ? (
          <Text style={[typography.barcode, { color: textOnColor(color), opacity: 0.7 }]} numberOfLines={1}>
            {code}
          </Text>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.form}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
          value={name}
          onChangeText={handleNameChange}
          placeholder="Card name"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="words"
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Logo</Text>
        <LogoSelector
          logoSlug={logoSlug}
          customLogoUri={card.customLogoUri}
          cardName={name}
          cardColor={color}
          brandResults={brandResults}
          onBrandSelect={handleBrandSelect}
          onClear={() => { setLogoSlug(undefined); setBrandResults([]); }}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Barcode</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
          value={code}
          onChangeText={setCode}
          placeholder="Barcode value"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />

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

        <Text style={[styles.label, { color: colors.textSecondary }]}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput, { backgroundColor: colors.surface, color: colors.text }]}
          value={notes}
          onChangeText={setNotes}
          onFocus={handleNotesFocus}
          placeholder="Optional notes"
          placeholderTextColor={colors.textSecondary}
          multiline
          textAlignVertical="top"
        />

        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 16 }]}>
          Created {new Date(card.createdAt).toLocaleDateString()}
          {' · '}Updated {new Date(card.updatedAt).toLocaleDateString()}
        </Text>
      </ScrollView>

      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: '#7f1d1d' }]}
          onPress={handleDelete}
        >
          <Text style={[typography.body, { color: '#fff', fontWeight: '600' }]}>Delete</Text>
        </Pressable>
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
          <Text style={[typography.body, { color: '#fff', fontWeight: '700' }]}>Save</Text>
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
    paddingTop: 16,
    paddingBottom: 12,
  },
  preview: {
    marginHorizontal: 20,
    height: 120,
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  form: { flex: 1 },
  formContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    gap: 10,
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
