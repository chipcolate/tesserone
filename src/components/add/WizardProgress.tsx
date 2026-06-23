import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, typography } from '../../theme';
import { mono } from '../../theme/fonts';

interface WizardProgressProps {
  /** Zero-based index of the active step. */
  stepIndex: number;
  /** Total number of steps. */
  total: number;
  title: string;
  subtitle: string;
}

/**
 * Header for the add-card wizard: a segmented progress bar, a "STEP n of N"
 * indicator, and the current step's title + subtitle. Mirrors the mono,
 * uppercase treatment of the tutorial step indicator.
 */
export function WizardProgress({ stepIndex, total, title, subtitle }: WizardProgressProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.segments}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: i <= stepIndex ? colors.accent : colors.border },
            ]}
          />
        ))}
      </View>

      <Text style={[styles.indicator, { color: colors.textSecondary }]}>
        {t('add.stepIndicator', {
          current: stepIndex + 1,
          total,
          defaultValue: `STEP ${stepIndex + 1} OF ${total}`,
        })}
      </Text>
      <Text style={[typography.title, styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 6,
  },
  segments: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  segment: {
    flex: 1,
    height: 4,
  },
  indicator: {
    fontFamily: mono.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
  },
});
