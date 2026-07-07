import { StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';
import { Button, ButtonProps } from 'react-native-paper';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radius } from '@/theme/spacing';

interface AppButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'saffron';
}

export function AppButton({
  variant = 'primary',
  style,
  contentStyle,
  labelStyle,
  ...props
}: AppButtonProps) {
  const mode = variant === 'outline' ? 'outlined' : 'contained';

  const buttonColor =
    variant === 'secondary'
      ? colors.gold
      : variant === 'saffron'
        ? colors.deepSaffron
        : colors.royalRed;

  const textColor =
    variant === 'outline'
      ? colors.royalRed
      : variant === 'secondary'
        ? colors.textPrimary
        : colors.white;

  return (
    <Button
      mode={mode}
      buttonColor={variant === 'outline' ? undefined : buttonColor}
      textColor={textColor}
      style={[
        styles.button,
        variant !== 'outline' && (shadows.md as ViewStyle),
        variant === 'outline' && styles.outline,
        style as ViewStyle,
      ]}
      contentStyle={[styles.content, contentStyle as ViewStyle]}
      labelStyle={[styles.label, labelStyle as TextStyle]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    marginVertical: 6,
  },
  outline: {
    borderColor: colors.gold,
    borderWidth: 2,
    backgroundColor: colors.white,
  },
  content: {
    paddingVertical: 10,
    minHeight: 58,
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
