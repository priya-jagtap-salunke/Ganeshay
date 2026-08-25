import { StyleSheet, TextStyle } from 'react-native';
import { TextInput, TextInputProps, HelperText, useTheme } from 'react-native-paper';
import { radius, touchTarget } from '@/theme/spacing';

type PaperInputProps = Omit<TextInputProps, 'error'>;

interface AppInputProps extends PaperInputProps {
  error?: string;
}

export function AppInput({ error, style, ...props }: AppInputProps) {
  const theme = useTheme();

  return (
    <>
      <TextInput
        mode="outlined"
        outlineColor={theme.colors.outline}
        activeOutlineColor={theme.colors.primary}
        outlineStyle={styles.outline}
        style={[
          styles.input,
          { backgroundColor: theme.colors.surface },
          style as TextStyle,
        ]}
        contentStyle={styles.content}
        error={Boolean(error)}
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
    marginVertical: 4,
    fontSize: 16,
  },
  outline: {
    borderRadius: radius.xs,
  },
  content: {
    fontSize: 16,
    minHeight: touchTarget.min - 8,
  },
  error: {
    marginTop: -2,
    marginBottom: 4,
  },
});
