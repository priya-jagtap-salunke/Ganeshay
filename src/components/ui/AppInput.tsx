import { StyleSheet, ViewStyle } from 'react-native';
import { TextInput, TextInputProps, HelperText } from 'react-native-paper';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radius } from '@/theme/spacing';

interface AppInputProps extends TextInputProps {
  error?: string;
}

export function AppInput({ error, style, ...props }: AppInputProps) {
  return (
    <>
      <TextInput
        mode="outlined"
        outlineColor={colors.grayLight}
        activeOutlineColor={colors.goldDark}
        outlineStyle={styles.outline}
        style={[styles.input, shadows.sm as ViewStyle, style as ViewStyle]}
        contentStyle={styles.content}
        theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
        {...props}
      />
      {error ? (
        <HelperText type="error" visible style={styles.error}>
          {error}
        </HelperText>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    marginVertical: 6,
    backgroundColor: colors.white,
    fontSize: 18,
    borderRadius: radius.md,
  },
  outline: {
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  content: {
    fontSize: 18,
    paddingVertical: 10,
  },
  error: {
    fontWeight: '500',
  },
});
