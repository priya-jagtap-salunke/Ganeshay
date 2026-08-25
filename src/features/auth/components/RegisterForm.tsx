import { useState } from 'react';
import { StyleSheet, View, ViewStyle, Pressable } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { registerVendorAccount } from '@/features/vendor/api/vendorApi';
import { useVendorStore } from '@/stores/vendorStore';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { getErrorMessage } from '@/utils/errors';
import { BRAND_NAME } from '@/theme/brandAssets';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

export function RegisterForm() {
  const router = useRouter();
  const setVendor = useVendorStore((state) => state.setVendor);
  const applyVendorToSettings = useVendorStore((state) => state.applyVendorToSettings);

  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!businessName.trim() || !email.trim() || !password.trim()) {
      setError('Enter stall name, email, and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const vendor = await registerVendorAccount({
        businessName,
        phone,
        address,
        email,
        password,
      });
      setVendor(vendor);
      applyVendorToSettings(vendor);
      router.replace('/(app)/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.brandCard, shadows.lg as ViewStyle]}>
        <BrandLogo variant="icon" size={72} />
        <Text style={styles.title}>Register Your Stall</Text>
        <Text style={styles.tagline}>{BRAND_NAME}</Text>
      </View>

      <View style={[styles.formCard, shadows.md as ViewStyle]}>
        <Text style={styles.subtitle}>Create your vendor account</Text>

        <AppInput
          label="Stall / Business Name *"
          value={businessName}
          onChangeText={setBusinessName}
        />
        <AppInput
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <AppInput
          label="Stall Address"
          value={address}
          onChangeText={setAddress}
          multiline
        />
        <AppInput
          label="Login Email *"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          left={<TextInput.Icon icon="email" color={colors.goldDark} />}
        />
        <AppInput
          label="Password *"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          left={<TextInput.Icon icon="lock" color={colors.goldDark} />}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton onPress={handleRegister} loading={loading} icon="store-plus">
          Create Stall Account
        </AppButton>

        <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.linkWrap}>
          <Text style={styles.linkText}>Already registered? Login</Text>
        </Pressable>
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
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.royalRed,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  tagline: {
    fontSize: 14,
    color: colors.goldDark,
    fontWeight: '600',
    marginTop: 4,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.royalRed,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    marginVertical: spacing.sm,
    fontSize: 14,
    fontWeight: '500',
  },
  linkWrap: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  linkText: {
    color: colors.royalRed,
    fontWeight: '700',
    fontSize: 15,
  },
});
