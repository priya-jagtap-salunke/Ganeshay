import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { usePortalStore } from '@/stores/portalStore';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { AppButton } from '@/components/ui/AppButton';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { spacing } from '@/theme/spacing';

export function AccountPendingScreen() {
  const router = useRouter();
  const theme = useTheme();

  const handleLogout = async () => {
    usePortalStore.getState().clearPortal();
    await supabase.auth.signOut();
    router.replace('/');
  };

  return (
    <ScreenContainer showBack={false}>
      <View style={styles.container}>
        <BrandLogo variant="icon" size={80} style={styles.logo} />
        <Text
          variant="headlineSmall"
          style={{ color: theme.colors.onSurface, textAlign: 'center', marginBottom: spacing.md }}
        >
          Account Not Active
        </Text>
        <Text
          variant="bodyLarge"
          style={{
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
            marginBottom: spacing.lg,
          }}
        >
          Your login is not linked to a stall yet. Please contact the platform admin to get your
          username and password, or ask them to activate your vendor account.
        </Text>
        <AppButton variant="outline" onPress={handleLogout} icon="logout">
          Back to Login
        </AppButton>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    alignItems: 'center',
  },
  logo: {
    marginBottom: spacing.lg,
  },
});
