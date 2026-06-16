import { Pressable, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme, textOnColor } from '../../theme';
import { CHROME_RADIUS } from '../../theme/geometry';
import { mono } from '../../theme/fonts';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = 'secondary', disabled, style }: ButtonProps) {
  const { colors } = useTheme();

  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.accent, fg: textOnColor(colors.accent), border: colors.accent },
    secondary: { bg: colors.surface, fg: colors.text, border: colors.border },
    danger: { bg: colors.danger, fg: colors.dangerText, border: colors.danger },
    ghost: { bg: 'transparent', fg: colors.text, border: colors.border },
  };
  const v = palette[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        style,
      ]}
    >
      <Text style={[styles.label, { color: v.fg }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: CHROME_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: mono.bold,
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
