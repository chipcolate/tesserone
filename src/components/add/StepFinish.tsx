import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useTranslation } from 'react-i18next';
import { useTheme, typography, CARD_COLORS } from '../../theme';
import { CHROME_RADIUS } from '../../theme/geometry';
import { mono } from '../../theme/fonts';
import { FidelityCard } from '../../types';
import { CardFace } from '../wallet/CardFace';
import { CardBack } from '../wallet/CardBack';

interface StepFinishProps {
  /** Draft card synthesized from the wizard state, for the live preview. */
  previewCard: FidelityCard;
  color: string;
  notes: string;
  onColorChange: (color: string) => void;
  onNotesChange: (notes: string) => void;
  bottomOffset: number;
}

/**
 * Step 3 of the add-card wizard: a live preview of the actual card (front face +
 * barcode back), plus the final color and notes tweaks before saving.
 */
export function StepFinish({
  previewCard,
  color,
  notes,
  onColorChange,
  onNotesChange,
  bottomOffset,
}: StepFinishProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <KeyboardAwareScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      bottomOffset={bottomOffset}
    >
      <View style={styles.previewFront}>
        <CardFace card={previewCard} />
      </View>
      <View style={styles.previewBack}>
        <CardBack card={previewCard} />
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
            onPress={() => onColorChange(c)}
            accessibilityRole="button"
          />
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('add.labelNotes')}</Text>
      <TextInput
        style={[styles.input, styles.notesInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={notes}
        onChangeText={onNotesChange}
        placeholder={t('add.placeholderNotes')}
        placeholderTextColor={colors.textSecondary}
        multiline
        textAlignVertical="top"
      />
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
  previewFront: {
    height: 150,
  },
  previewBack: {
    height: 300,
    marginTop: 12,
  },
  label: {
    fontFamily: mono.bold,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 24,
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
});
