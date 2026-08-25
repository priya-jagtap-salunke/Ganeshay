import { useEffect, useState } from 'react';
import { StyleSheet, View, ViewStyle, Pressable, ScrollView } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { useRouter, type Href } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { usePortalStore } from '@/stores/portalStore';
import { BRAND_NAME } from '@/theme/brandAssets';
import { elevation } from '@/theme/shadows';
import { radius, spacing, touchTarget } from '@/theme/spacing';

export function LoginForm() {
  const theme = useTheme();
  const router = useRouter();
  const setPortal = usePortalStore((state) => state.setPortal);
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setPortal('vendor');
  }, [setPortal]);

  const handleLogin = async () => {
    if (!loginEmail.trim() || !password) {
      setError('Please enter login email and password');
      return;
    }

    setLoading(true);
    setError('');
    setPortal('vendor');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim().toLowerCase(),
      password,
    });

    if (authError) {
      setError(authError.message);
    }
    setLoading(false);
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
        <BrandLogo variant="icon" size={88} />
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
          Vendor login for your stall dashboard
        </Text>
      </View>

      <AppCard elevationLevel={1}>
        <View style={styles.formInner}>
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
            Vendor Login
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.helper, { color: theme.colors.onSurfaceVariant }]}
          >
            Use the login email and password shared by your platform admin.
          </Text>

          <AppInput
            label="Login Email"
            value={loginEmail}
            onChangeText={setLoginEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon="email" color={theme.colors.onSurfaceVariant} />}
          />
          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            left={<TextInput.Icon icon="lock" color={theme.colors.onSurfaceVariant} />}
          />

          <Pressable
            onPress={() => router.push('/(auth)/forgot-password' as Href)}
            style={styles.forgotWrap}
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
            android_ripple={{ color: theme.colors.primary + '22', borderless: true }}
          >
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              Forgot password?
            </Text>
          </Pressable>

          {error ? (
            <Text variant="bodySmall" style={[styles.error, { color: theme.colors.error }]}>
              {error}
            </Text>
          ) : null}

          <AppButton onPress={handleLogin} loading={loading} disabled={loading} icon="login">
            Login to Dashboard
          </AppButton>
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
  forgotWrap: {
    alignSelf: 'flex-end',
    minHeight: touchTarget.min,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  error: {
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
});
