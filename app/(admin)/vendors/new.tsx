import { useState } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { createVendorAccount } from '@/features/admin/api/adminApi';
import { getErrorMessage } from '@/utils/errors';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { shadows } from '@/theme/shadows';

export default function AdminNewVendorScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [mapLink, setMapLink] = useState('');
  const [stallDescription, setStallDescription] = useState('');
  const [bookingPrefix, setBookingPrefix] = useState('ST');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!loginEmail.trim() || !password.trim() || !businessName.trim()) {
      Alert.alert('Missing fields', 'Login email, password, and business name are required.');
      return;
    }

    setCreating(true);
    try {
      await createVendorAccount({
        loginEmail,
        password,
        businessName,
        phone,
        address,
        mapLink,
        stallDescription,
        bookingPrefix,
      });

      await queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-platform-overview'] });

      setLoginEmail('');
      setPassword('');
      setBusinessName('');
      setPhone('');
      setAddress('');
      setMapLink('');
      setStallDescription('');
      setBookingPrefix('ST');

      Alert.alert('Success', 'Vendor added successfully.', [
        {
          text: 'OK',
          onPress: () => router.replace('/(admin)/vendors'),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={[styles.card, shadows.sm as ViewStyle]}>
        <Text style={styles.sectionTitle}>Login Credentials</Text>
        <Text style={styles.hint}>
          These credentials are shared with the stall owner for the vendor app login.
        </Text>

        <AppInput
          label="Login Email (Username) *"
          value={loginEmail}
          onChangeText={setLoginEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <AppInput
          label="Password *"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.sectionTitle}>Stall Details</Text>

        <AppInput
          label="Business / Stall Name *"
          value={businessName}
          onChangeText={setBusinessName}
        />
        <AppInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <AppInput label="Address" value={address} onChangeText={setAddress} multiline />
        <AppInput
          label="Google Maps Link"
          value={mapLink}
          onChangeText={setMapLink}
          autoCapitalize="none"
        />
        <AppInput
          label="Stall Description"
          value={stallDescription}
          onChangeText={setStallDescription}
          multiline
        />
        <AppInput
          label="Booking Prefix (e.g. ST, GM)"
          value={bookingPrefix}
          onChangeText={setBookingPrefix}
          autoCapitalize="characters"
        />

        <AppButton onPress={handleCreate} loading={creating} icon="account-plus">
          Create Vendor Account
        </AppButton>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f3460',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  hint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
});
