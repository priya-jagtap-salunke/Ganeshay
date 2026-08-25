import { useState } from 'react';
import { StyleSheet, View, ViewStyle, Pressable, ScrollView, Platform } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { requestPasswordReset } from '@/features/auth/api/passwordResetApi';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { getErrorMessage } from '@/utils/errors';
import { BRAND_NAME } from '@/theme/brandAssets';
import { elevation } from '@/theme/shadows';
import { radius, spacing, touchTarget } from '@/theme/spacing';

export function ForgotPasswordForm() {
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your login email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const sentMessage =
    Platform.OS === 'web'
      ? 'If an account exists for that email, we sent a password reset link. Check your inbox (and spam folder), then open the link to choose a new password.'
      : 'If an account exists for that email, we sent a password reset link. Open the email on this phone and tap the link so Ganeshay can open the new-password screen.';

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
          Reset your vendor login password
        </Text>
      </View>

      <AppCard elevationLevel={1}>
        <View style={styles.formInner}>
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
            Forgot password?
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.helper, { color: theme.colors.onSurfaceVariant }]}
          >
            Enter the login email for your stall. If an account exists, we will send a reset link.
          </Text>

          {sent ? (
            <Text
              variant="bodyMedium"
              style={[styles.success, { color: theme.colors.primary }]}
            >
              {sentMessage}
            </Text>
          ) : (
            <>
              <AppInput
                label="Login Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                left={<TextInput.Icon icon="email" color={theme.colors.onSurfaceVariant} />}
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
                icon="email-fast"
              >
                Send reset link
              </AppButton>
            </>
          )}

          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            style={styles.linkWrap}
            accessibilityRole="button"
            accessibilityLabel="Back to login"
            android_ripple={{ color: theme.colors.primary + '22', borderless: true }}
          >
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              Back to login
            </Text>
          </Pressable>
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
  success: {
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 22,
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
