import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter, type Href } from 'expo-router';
import { consumeAuthCallbackUrl } from '@/features/auth/api/passwordResetApi';
import { useAuthStore } from '@/stores/authStore';

/**
 * Handles deep links / web redirects that complete Supabase password recovery.
 */
export function usePasswordRecoveryLink() {
  const router = useRouter();
  const setPasswordRecoveryPending = useAuthStore(
    (state) => state.setPasswordRecoveryPending
  );

  useEffect(() => {
    let cancelled = false;

    const handleUrl = async (url: string | null) => {
      if (!url || cancelled) return;

      const onResetPath = url.includes('reset-password');
      const looksLikeAuthCallback =
        url.includes('access_token') ||
        url.includes('refresh_token') ||
        url.includes('code=') ||
        url.includes('type=recovery');

      if (!looksLikeAuthCallback && !onResetPath) return;

      // Mark recovery early so AuthGuard does not bounce to dashboard while tokens settle.
      if (onResetPath || url.includes('type=recovery')) {
        setPasswordRecoveryPending(true);
      }

      if (!looksLikeAuthCallback) {
        if (onResetPath) {
          router.replace('/(auth)/reset-password' as Href);
        }
        return;
      }

      try {
        const result = await consumeAuthCallbackUrl(url);
        if (cancelled || !result) return;

        if (result === 'recovery' || onResetPath) {
          setPasswordRecoveryPending(true);
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.history.replaceState({}, '', '/reset-password');
          }
          router.replace('/(auth)/reset-password' as Href);
        }
      } catch {
        // Leave the user on whatever screen they're on; form can show errors later.
      }
    };

    Linking.getInitialURL().then(handleUrl);

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    // Web: hash/query may already be on the current location when the app boots.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      void handleUrl(window.location.href);
    }

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [router, setPasswordRecoveryPending]);
}
