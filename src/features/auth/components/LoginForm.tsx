import { useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { colors, gradients } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...gradients.hero]}
        style={[styles.brandCard, shadows.lg as ViewStyle]}
      >
        <Text style={styles.brandOm}>🙏</Text>
        <Text style={styles.title}>Bappaji Booking</Text>
        <Text style={styles.tagline}>Ganapati Murti Stall</Text>
      </LinearGradient>

      <View style={[styles.formCard, shadows.md as ViewStyle]}>
        <Text style={styles.subtitle}>Admin Login</Text>

        <AppInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          left={<TextInput.Icon icon="email" color={colors.goldDark} />}
        />
        <AppInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          left={<TextInput.Icon icon="lock" color={colors.goldDark} />}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton onPress={handleLogin} loading={loading} disabled={loading} icon="login">
          Login
        </AppButton>
      </View>
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
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.goldLight,
  },
  brandOm: {
    fontSize: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 15,
    color: colors.goldLight,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 1,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.royalRed,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    marginVertical: spacing.sm,
    fontSize: 15,
    fontWeight: '500',
  },
});
