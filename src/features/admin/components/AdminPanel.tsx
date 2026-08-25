import { useState } from 'react';
import { StyleSheet, View, FlatList, Alert, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import {
  createVendorAccount,
  fetchAllVendors,
  linkVendorLogin,
} from '@/features/admin/api/adminApi';
import { getErrorMessage } from '@/utils/errors';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { shadows } from '@/theme/shadows';

export function AdminPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: vendors, isLoading, refetch } = useQuery({
    queryKey: ['admin-vendors'],
    queryFn: fetchAllVendors,
  });

  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bookingPrefix, setBookingPrefix] = useState('ST');
  const [creating, setCreating] = useState(false);

  const handleCreateVendor = async () => {
    if (!loginEmail.trim() || !password.trim() || !businessName.trim()) {
      Alert.alert('Missing fields', 'Login email, password, and business name are required.');
      return;
    }

    setCreating(true);
    try {
      const result = await createVendorAccount({
        loginEmail,
        password,
        businessName,
        phone,
        address,
        mapLink: '',
        stallDescription: '',
        bookingPrefix,
      });

      Alert.alert(
        'Vendor Created',
        `Share these credentials with the stall owner:\n\nLogin: ${result.loginEmail}\nPassword: ${password}`
      );

      setLoginEmail('');
      setPassword('');
      setBusinessName('');
      setPhone('');
      setAddress('');
      setBookingPrefix('ST');
      await queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const handleLinkAccount = async (vendorId: string, email: string) => {
    try {
      await linkVendorLogin(vendorId, email);
      Alert.alert('Linked', 'Vendor login linked successfully.');
      await refetch();
    } catch (error) {
      Alert.alert('Link Failed', getErrorMessage(error));
    }
  };

  return (
    <ScreenContainer title="Admin Panel" onBack={() => router.replace('/(app)/settings')}>
      <LoadingOverlay visible={isLoading && !vendors} />

      <View style={[styles.card, shadows.sm as ViewStyle]}>
        <Text style={styles.sectionTitle}>Create Vendor Login</Text>
        <Text style={styles.hint}>
          Create a stall account with login email and password. Share these credentials with the vendor.
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
        <AppInput
          label="Business / Stall Name *"
          value={businessName}
          onChangeText={setBusinessName}
        />
        <AppInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <AppInput label="Address" value={address} onChangeText={setAddress} multiline />
        <AppInput
          label="Booking Prefix (e.g. ST, GM)"
          value={bookingPrefix}
          onChangeText={setBookingPrefix}
          autoCapitalize="characters"
        />

        <AppButton onPress={handleCreateVendor} loading={creating} icon="account-plus">
          Create Vendor Account
        </AppButton>
      </View>

      <Text style={styles.listTitle}>Registered Vendors</Text>
      <FlatList
        data={vendors ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.vendorRow, shadows.sm as ViewStyle]}>
            <Text style={styles.vendorName}>{item.business_name}</Text>
            <Text style={styles.vendorMeta}>
              Login: {item.login_email || 'Not set'} • Prefix: {item.booking_prefix}
            </Text>
            <Text style={[styles.vendorStatus, item.linked ? styles.linked : styles.pending]}>
              {item.linked ? 'Login linked' : 'Login not linked'}
            </Text>
            {!item.linked && item.login_email ? (
              <AppButton
                variant="outline"
                onPress={() => handleLinkAccount(item.id, item.login_email!)}
              >
                Link Login (after creating user in Supabase Auth)
              </AppButton>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.empty}>No vendors yet. Create the first stall account above.</Text>
          ) : null
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.royalRed,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  vendorRow: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  vendorName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  vendorMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  vendorStatus: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: spacing.sm,
  },
  linked: {
    color: colors.success,
  },
  pending: {
    color: colors.deepSaffron,
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    padding: spacing.lg,
  },
});
