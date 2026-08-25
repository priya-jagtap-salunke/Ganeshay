import { StyleSheet } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { touchTarget } from '@/theme/spacing';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  actions?: React.ReactNode;
}

export function AppHeader({ title, showBack = true, actions }: AppHeaderProps) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Appbar.Header
      elevated
      mode="small"
      style={{ backgroundColor: theme.colors.primary }}
    >
      {showBack ? (
        <Appbar.BackAction
          onPress={() => router.back()}
          color={theme.colors.onPrimary}
          style={styles.touch}
          accessibilityLabel="Go back"
        />
      ) : null}
      <Appbar.Content
        title={title}
        titleStyle={[styles.title, { color: theme.colors.onPrimary }]}
        color={theme.colors.onPrimary}
      />
      {actions}
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '500',
  },
  touch: {
    minWidth: touchTarget.min,
    minHeight: touchTarget.min,
  },
});
