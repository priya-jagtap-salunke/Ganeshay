import { StyleSheet } from 'react-native';
import { Appbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  actions?: React.ReactNode;
}

export function AppHeader({ title, showBack = true, actions }: AppHeaderProps) {
  const router = useRouter();

  return (
    <Appbar.Header style={styles.header} elevated>
      {showBack ? (
        <Appbar.BackAction onPress={() => router.back()} color={colors.white} />
      ) : null}
      <Appbar.Content title={title} titleStyle={styles.title} />
      {actions}
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.maroon,
  },
  title: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
});
