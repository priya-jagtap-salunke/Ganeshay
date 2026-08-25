import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { usePortalStore } from '@/stores/portalStore';
import { elevation } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';
import { isAdminPortalAvailable } from '@/utils/platform';

export function LandingPage() {
  const router = useRouter();
  const theme = useTheme();
  const setPortal = usePortalStore((state) => state.setPortal);
  const showAdminLogin = isAdminPortalAvailable();

  return (
    <ScrollView
      style={[styles.page, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.hero,
          elevation.level1 as ViewStyle,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <BrandLogo variant="full" width={300} />
      </View>

      <AppCard style={styles.card} elevationLevel={1}>
        <View style={styles.cardInner}>
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
            {showAdminLogin ? 'Choose how you want to sign in' : 'Sign in to your stall'}
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.cardHint, { color: theme.colors.onSurfaceVariant }]}
          >
            {showAdminLogin
              ? 'Vendors use the stall dashboard. Platform admins manage vendors and view reports.'
              : 'Use your vendor login to open the stall dashboard.'}
          </Text>

          <AppButton
            icon="store"
            onPress={() => {
              setPortal('vendor');
              router.push('/(auth)/login');
            }}
            style={styles.button}
          >
            Vendor Login
          </AppButton>

          {showAdminLogin ? (
            <AppButton
              variant="outline"
              icon="shield-account"
              onPress={() => {
                setPortal('admin');
                router.push('/(admin-auth)/admin-login');
              }}
              style={styles.button}
            >
              Admin Login
            </AppButton>
          ) : null}
        </View>
      </AppCard>

      <Text
        variant="bodySmall"
        style={[styles.footer, { color: theme.colors.onSurfaceVariant }]}
      >
        {showAdminLogin
          ? 'Share the vendor login link with stall owners. Admin access stays on this home page only.'
          : 'Admin access is available on the web app only.'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    paddingVertical: spacing.xl,
  },
  hero: {
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  card: {
    marginHorizontal: 0,
  },
  cardInner: {
    padding: spacing.lg,
  },
  cardHint: {
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  button: {
    marginBottom: spacing.sm,
  },
  footer: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
