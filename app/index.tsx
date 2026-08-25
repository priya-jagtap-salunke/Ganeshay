import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { LandingPage } from '@/features/auth/components/LandingPage';
import { useAuthStore } from '@/stores/authStore';
import { usePortalStore } from '@/stores/portalStore';
import { fetchIsSuperAdmin } from '@/features/admin/api/adminApi';
import { colors } from '@/theme/colors';
import { isAdminPortalAvailable } from '@/utils/platform';

export default function HomeScreen() {
  const router = useRouter();
  const { session, isLoading } = useAuthStore();
  const portal = usePortalStore((state) => state.portal);
  const adminAvailable = isAdminPortalAvailable();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [portalReady, setPortalReady] = useState(() =>
    usePortalStore.persist.hasHydrated()
  );

  useEffect(() => {
    const unsub = usePortalStore.persist.onFinishHydration(() => {
      setPortalReady(true);
    });
    if (usePortalStore.persist.hasHydrated()) {
      setPortalReady(true);
    }
    return unsub;
  }, []);

  useEffect(() => {
    if (!session) {
      setIsAdmin(null);
      return;
    }

    // Native builds never route into the admin portal.
    if (!adminAvailable) {
      setIsAdmin(false);
      return;
    }

    fetchIsSuperAdmin()
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
  }, [session?.user?.id, adminAvailable]);

  useEffect(() => {
    if (isLoading || !portalReady || !session || isAdmin === null) return;

    // Dual-role users go to the portal they last chose (web only).
    if (adminAvailable && isAdmin && portal !== 'vendor') {
      router.replace('/(admin)');
      return;
    }

    router.replace('/(app)/dashboard');
  }, [isLoading, portalReady, session, isAdmin, portal, adminAvailable, router]);

  if (isLoading || !portalReady || (session && isAdmin === null)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.royalRed} />
      </View>
    );
  }

  if (session) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.royalRed} />
      </View>
    );
  }

  return (
    <ScreenContainer showBack={false}>
      <LandingPage />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warmIvory,
  },
});
