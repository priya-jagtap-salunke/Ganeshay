import { useEffect, useState } from 'react';
import { StyleSheet, View, ViewStyle, Pressable } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { usePortalStore } from '@/stores/portalStore';
import { BRAND_NAME } from '@/theme/brandAssets';
import { colors } from '@/theme/colors';
import { elevation } from '@/theme/shadows';
import { radius, spacing, touchTarget } from '@/theme/spacing';

export function AdminLoginForm() {
  const router = useRouter();
  const theme = useTheme();
  const setPortal = usePortalStore((state) => state.setPortal);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setPortal('admin');
  }, [setPortal]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Enter admin email and password');
      return;
    }

    setLoading(true);
    setError('');
    setPortal('admin');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      setError(authError.message);
    }

    setLoading(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.adminSurface }]}>
      <View
        style={[
          styles.brandCard,
          elevation.level1 as ViewStyle,
          { backgroundColor: colors.adminPrimary },
        ]}
      >
        <BrandLogo variant="icon" size={72} framed />
        <Text
          variant="headlineMedium"
          style={{
            color: colors.adminOnPrimary,
            textAlign: 'center',
            fontWeight: '500',
            marginTop: spacing.sm,
          }}
        >
          Platform Admin
        </Text>
        <Text
          variant="bodyMedium"
          style={{
            color: colors.adminOnPrimary,
            opacity: 0.85,
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          {BRAND_NAME} · Manage vendors, logins, and reports
        </Text>
      </View>

      <AppCard elevationLevel={1}>
        <View style={styles.formInner}>
          <Text
            variant="titleLarge"
            style={{
              color: colors.adminPrimary,
              textAlign: 'center',
              marginBottom: spacing.lg,
            }}
          >
            Admin Login
          </Text>

          <AppInput
            label="Admin Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon="shield-account" color={theme.colors.onSurfaceVariant} />}
          />
          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            left={<TextInput.Icon icon="lock" color={theme.colors.onSurfaceVariant} />}
          />

          {error ? (
            <Text variant="bodySmall" style={[styles.error, { color: theme.colors.error }]}>
              {error}
            </Text>
          ) : null}

          <AppButton
            onPress={handleLogin}
            loading={loading}
            icon="login"
            buttonColor={colors.adminPrimary}
          >
            Login to Admin Dashboard
          </AppButton>

          <Pressable
            onPress={() => router.replace('/')}
            style={styles.linkWrap}
            accessibilityRole="button"
            accessibilityLabel="Back to home"
            android_ripple={{ color: theme.colors.primary + '22', borderless: true }}
          >
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              Back to home
            </Text>
          </Pressable>
        </View>
      </AppCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  brandCard: {
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  formInner: {
    padding: spacing.lg,
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
