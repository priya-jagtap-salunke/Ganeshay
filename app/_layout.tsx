import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { queryClient } from '@/lib/queryClient';
import { paperTheme } from '@/theme/paperTheme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { usePortalStore } from '@/stores/portalStore';
import { useVendorStore } from '@/stores/vendorStore';
import { useVendorBootstrap } from '@/features/vendor/hooks/useVendorBootstrap';
import { usePasswordRecoveryLink } from '@/features/auth/hooks/usePasswordRecoveryLink';
import { fetchIsSuperAdmin } from '@/features/admin/api/adminApi';
import { isAdminPortalAvailable } from '@/utils/platform';

SplashScreen.preventAutoHideAsync();

function isLandingRoute(segments: string[]): boolean {
  const root = segments[0];
  return !root || root === 'index';
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, isLoading, setSession, passwordRecoveryPending, setPasswordRecoveryPending } =
    useAuthStore();
  const vendor = useVendorStore((state) => state.vendor);
  const vendorLoading = useVendorStore((state) => state.isLoading);
  const portal = usePortalStore((state) => state.portal);
  const setPortal = usePortalStore((state) => state.setPortal);
  const segments = useSegments();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [portalReady, setPortalReady] = useState(() =>
    usePortalStore.persist.hasHydrated()
  );
  const adminAvailable = isAdminPortalAvailable();

  useVendorBootstrap();
  usePasswordRecoveryLink();

  useEffect(() => {
    const unsub = usePortalStore.persist.onFinishHydration(() => {
      setPortalReady(true);
    });
    if (usePortalStore.persist.hasHydrated()) {
      setPortalReady(true);
    }
    return unsub;
  }, []);

  // Native builds never keep an admin portal intent.
  useEffect(() => {
    if (!portalReady || adminAvailable) return;
    if (portal === 'admin') {
      setPortal('vendor');
    }
  }, [portalReady, adminAvailable, portal, setPortal]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      SplashScreen.hideAsync();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryPending(true);
        router.replace('/(auth)/reset-password' as Href);
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setPasswordRecoveryPending, router]);

  useEffect(() => {
    if (!session) {
      setIsAdmin(null);
      return;
    }

    // Skip admin role checks on native — admin routes are web-only.
    if (!adminAvailable) {
      setIsAdmin(false);
      return;
    }

    fetchIsSuperAdmin()
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
  }, [session?.user?.id, adminAvailable]);

  useEffect(() => {
    if (isLoading || !portalReady || (session && isAdmin === null)) return;

    const root = segments[0];
    const inLanding = isLandingRoute(segments as string[]);
    const inAdminAuth = root === '(admin-auth)';
    const inAdmin = root === '(admin)';
    const inVendorAuth = root === '(auth)';
    const inVendorApp = root === '(app)';
    const authScreen = segments[1] as string | undefined;
    const onVendorLogin = authScreen === 'login';
    const onAccountPending = authScreen === 'account-pending';
    const onForgotPassword = authScreen === 'forgot-password';
    const onResetPassword = authScreen === 'reset-password';
    const onAdminLogin = authScreen === 'admin-login';
    const wantsVendor = portal === 'vendor';
    const wantsAdmin =
      adminAvailable && (portal === 'admin' || (Boolean(isAdmin) && !wantsVendor));

    // Deep links / stale navigation into admin on native → vendor landing/login.
    if (!adminAvailable && (inAdmin || inAdminAuth || onAdminLogin)) {
      router.replace(session ? '/(app)/dashboard' : '/');
      return;
    }

    // Recovery session: keep user on the new-password screen until they finish.
    if (passwordRecoveryPending) {
      if (!onResetPassword) {
        router.replace('/(auth)/reset-password' as Href);
      }
      return;
    }

    if (!session) {
      if (inAdmin) {
        router.replace('/(admin-auth)/admin-login');
        return;
      }

      if (inVendorApp) {
        router.replace('/');
        return;
      }

      if (onForgotPassword || onResetPassword) {
        return;
      }

      if (!inLanding && !inVendorAuth && !inAdminAuth) {
        router.replace('/');
      }

      return;
    }

    // Super-admins who chose Vendor Login should use the vendor app.
    // Admin portal routing only runs on web.
    if (isAdmin && wantsAdmin) {
      if (inLanding || inAdminAuth || (inVendorAuth && onVendorLogin)) {
        router.replace('/(admin)');
        return;
      }

      if (inVendorApp || onAccountPending) {
        router.replace('/(admin)');
        return;
      }

      if (!inAdmin) {
        router.replace('/(admin)');
      }

      return;
    }

    if (inAdmin || inAdminAuth || onAdminLogin) {
      if (!(isAdmin && wantsVendor)) {
        router.replace('/(auth)/login');
        return;
      }
    }

    if (vendorLoading) return;

    if (!vendor && !onAccountPending) {
      router.replace('/(auth)/account-pending');
      return;
    }

    if (
      vendor &&
      (inLanding ||
        inAdmin ||
        inAdminAuth ||
        (inVendorAuth &&
          (onVendorLogin || onAccountPending || onForgotPassword || onResetPassword)))
    ) {
      router.replace('/(app)/dashboard');
    }
  }, [
    session,
    isLoading,
    portalReady,
    vendorLoading,
    vendor,
    isAdmin,
    portal,
    adminAvailable,
    passwordRecoveryPending,
    segments,
    router,
  ]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={paperTheme}>
          <AuthGuard>
            <Stack screenOptions={{ headerShown: false }} />
          </AuthGuard>
        </PaperProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
