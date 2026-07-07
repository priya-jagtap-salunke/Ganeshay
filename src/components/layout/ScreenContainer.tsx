import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors, gradients } from '@/theme/colors';
import { shadows } from '@/theme/shadows';

interface ScreenContainerProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  style?: ViewStyle;
}

export function ScreenContainer({
  children,
  title,
  showBack = true,
  onBack,
  style,
}: ScreenContainerProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());

  return (
    <SafeAreaView style={[styles.container, style]} edges={['top', 'left', 'right']}>
      {title ? (
        <LinearGradient
          colors={[...gradients.header]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, shadows.md as ViewStyle]}
        >
          <View style={styles.headerInner}>
            {showBack ? (
              <Appbar.BackAction onPress={handleBack} color={colors.white} />
            ) : (
              <View style={styles.headerSpacer} />
            )}
            <Appbar.Content title={title} titleStyle={styles.headerTitle} style={styles.headerContent} />
          </View>
          <View style={styles.goldBar} />
        </LinearGradient>
      ) : null}
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
  header: {
    paddingBottom: 4,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  headerSpacer: {
    width: 48,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  goldBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.gold,
  },
  content: {
    flex: 1,
  },
});
