import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { elevation } from '@/theme/shadows';
import { touchTarget } from '@/theme/spacing';

interface ScreenContainerProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  style?: ViewStyle;
  actions?: React.ReactNode;
}

export function ScreenContainer({
  children,
  title,
  showBack = true,
  onBack,
  style,
  actions,
}: ScreenContainerProps) {
  const router = useRouter();
  const theme = useTheme();
  const handleBack = onBack ?? (() => router.back());

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }, style]}
      edges={['top', 'left', 'right']}
    >
      {title ? (
        <Appbar.Header
          elevated
          mode="small"
          style={[
            styles.header,
            { backgroundColor: theme.colors.primary },
            elevation.level2 as ViewStyle,
          ]}
          statusBarHeight={0}
        >
          {showBack ? (
            <Appbar.BackAction
              onPress={handleBack}
              color={theme.colors.onPrimary}
              style={styles.touch}
              accessibilityLabel="Go back"
            />
          ) : null}
          <Appbar.Content
            title={title}
            titleStyle={[styles.headerTitle, { color: theme.colors.onPrimary }]}
            color={theme.colors.onPrimary}
          />
          {actions}
        </Appbar.Header>
      ) : null}
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    elevation: 0,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '500',
    letterSpacing: 0,
  },
  touch: {
    minWidth: touchTarget.min,
    minHeight: touchTarget.min,
  },
  content: {
    flex: 1,
  },
});
