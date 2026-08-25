import { useState } from 'react';
import { StyleSheet, View, ViewStyle, Pressable, ScrollView } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { useRouter, type Href } from 'expo-router';
import { updatePassword } from '@/features/auth/api/passwordResetApi';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useAuthStore } from '@/stores/authStore';
import { getErrorMessage } from '@/utils/errors';
import { BRAND_NAME } from '@/theme/brandAssets';
import { elevation } from '@/theme/shadows';
import { radius, spacing, touchTarget } from '@/theme/spacing';

export function ResetPasswordForm() {
  const theme = useTheme();
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const setPasswordRecoveryPending = useAuthStore(
    (state) => state.setPasswordRecoveryPending
  );

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const canReset = Boolean(session);

  const handleSubmit = async () => {
    if (!session) {
      setError('Open the reset link from your email to continue.');
      return;
    }
    if (!password || !confirmPassword) {
      setError('Enter and confirm your new password');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.trim().length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await updatePassword(password);
      setPasswordRecoveryPending(false);
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.page, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.brandCard,
          elevation.level1 as ViewStyle,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <BrandLogo variant="icon" size={72} />
        <Text
          variant="headlineMedium"
          style={{
            color: theme.colors.primary,
            textAlign: 'center',
            fontWeight: '500',
            marginTop: spacing.sm,
          }}
        >
          {BRAND_NAME}
        </Text>
        <Text
          variant="bodyMedium"
          style={{
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          Choose a new login password
        </Text>
      </View>

      <AppCard elevationLevel={1}>
        <View style={styles.formInner}>
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
            Reset password
          </Text>

          {done ? (
            <>
              <Text
                variant="bodyMedium"
                style={[styles.helper, { color: theme.colors.onSurfaceVariant }]}
              >
                Your password was updated. You can continue to your stall dashboard.
              </Text>
              <AppButton
                onPress={() => router.replace('/(app)/dashboard')}
                icon="view-dashboard"
              >
                Go to dashboard
              </AppButton>
              <Pressable
                onPress={() => router.replace('/(auth)/login')}
                style={styles.linkWrap}
                accessibilityRole="button"
                accessibilityLabel="Back to login"
              >
                <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                  Back to login
                </Text>
              </Pressable>
            </>
          ) : !canReset ? (
            <>
              <Text
                variant="bodyMedium"
                style={[styles.helper, { color: theme.colors.onSurfaceVariant }]}
              >
                Open the password reset link from your email on this device to set a new password.
                You can also request a new link from the login screen.
              </Text>
              <AppButton
                onPress={() => router.replace('/(auth)/forgot-password' as Href)}
                icon="email-fast"
                variant="tonal"
              >
                Request reset link
              </AppButton>
              <Pressable
                onPress={() => router.replace('/(auth)/login')}
                style={styles.linkWrap}
                accessibilityRole="button"
                accessibilityLabel="Back to login"
              >
                <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                  Back to login
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text
                variant="bodyMedium"
                style={[styles.helper, { color: theme.colors.onSurfaceVariant }]}
              >
                Enter a new password for your vendor login.
              </Text>

              <AppInput
                label="New password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                left={<TextInput.Icon icon="lock" color={theme.colors.onSurfaceVariant} />}
              />
              <AppInput
                label="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                left={<TextInput.Icon icon="lock-check" color={theme.colors.onSurfaceVariant} />}
              />

              {error ? (
                <Text variant="bodySmall" style={[styles.error, { color: theme.colors.error }]}>
                  {error}
                </Text>
              ) : null}

              <AppButton
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
                icon="key-variant"
              >
                Update password
              </AppButton>
            </>
          )}
        </View>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  brandCard: {
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  formInner: {
    padding: spacing.lg,
  },
  helper: {
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  error: {
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  linkWrap: {
    marginTop: spacing.md,
    alignItems: 'center',
    minHeight: touchTarget.min,
    justifyContent: 'center',
  },
});
