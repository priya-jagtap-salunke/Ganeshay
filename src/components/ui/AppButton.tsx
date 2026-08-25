import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Button, ButtonProps, useTheme } from 'react-native-paper';
import { radius, touchTarget } from '@/theme/spacing';

interface AppButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'saffron' | 'tonal' | 'text';
}

export function AppButton({
  variant = 'primary',
  style,
  contentStyle,
  labelStyle,
  ...props
}: AppButtonProps) {
  const theme = useTheme();

  const mode =
    variant === 'outline'
      ? 'outlined'
      : variant === 'text'
        ? 'text'
        : variant === 'tonal' || variant === 'secondary'
          ? 'contained-tonal'
          : 'contained';

  const buttonColor =
    variant === 'primary'
      ? theme.colors.primary
      : variant === 'saffron'
        ? theme.colors.tertiary
        : variant === 'secondary' || variant === 'tonal'
          ? theme.colors.secondaryContainer
          : undefined;

  const textColor =
    variant === 'outline' || variant === 'text'
      ? theme.colors.primary
      : variant === 'secondary' || variant === 'tonal'
        ? theme.colors.onSecondaryContainer
        : theme.colors.onPrimary;

  return (
    <Button
      mode={mode}
      buttonColor={buttonColor}
      textColor={textColor}
      rippleColor={theme.colors.primary + '22'}
      style={[styles.button, style as ViewStyle]}
      contentStyle={[styles.content, contentStyle as ViewStyle]}
      labelStyle={[styles.label, labelStyle as TextStyle]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.full,
    marginVertical: 4,
  },
  content: {
    paddingVertical: 6,
    minHeight: touchTarget.comfortable,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
