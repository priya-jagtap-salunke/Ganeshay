import { useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { setupVendorForCurrentUser } from '@/features/vendor/api/vendorApi';
import { useVendorStore } from '@/stores/vendorStore';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { getErrorMessage } from '@/utils/errors';
import { BRAND_NAME } from '@/theme/brandAssets';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

export function SetupVendorForm() {
  const setVendor = useVendorStore((state) => state.setVendor);
  const applyVendorToSettings = useVendorStore((state) => state.applyVendorToSettings);

  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSetup = async () => {
    if (!businessName.trim()) {
      setError('Enter your stall name.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const vendor = await setupVendorForCurrentUser({
        businessName,
        phone,
        address,
      });
      setVendor(vendor);
      applyVendorToSettings(vendor);
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
        <Text style={styles.title}>Complete Stall Setup</Text>
        <Text style={styles.tagline}>{BRAND_NAME} · One last step before you start booking</Text>
      </View>

      <View style={[styles.formCard, shadows.md as ViewStyle]}>
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

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton onPress={handleSetup} loading={loading} icon="store-check">
          Save Stall Profile
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
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  title: {
    fontSize: 24,
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
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    marginVertical: spacing.sm,
    fontSize: 14,
  },
});
