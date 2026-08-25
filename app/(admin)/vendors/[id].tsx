import { useState } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { AdminVendorReportsPanel } from '@/features/admin/components/AdminVendorReportsPanel';
import { fetchVendorById, linkVendorLogin } from '@/features/admin/api/adminApi';
import { getErrorMessage } from '@/utils/errors';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { shadows } from '@/theme/shadows';

export default function AdminVendorReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vendorId = String(id);
  const [linkEmail, setLinkEmail] = useState('');
  const [linking, setLinking] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);

  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ['admin-vendor', vendorId],
    queryFn: () => fetchVendorById(vendorId),
    enabled: Boolean(vendorId),
  });

  const handleLinkLogin = async () => {
    if (!linkEmail.trim()) {
      Alert.alert('Missing email', 'Enter the vendor login email to link.');
      return;
    }

    setLinking(true);
    try {
      await linkVendorLogin(vendorId, linkEmail);
      Alert.alert('Linked', 'Vendor login linked successfully.');
      setLinkEmail('');
      setShowLinkForm(false);
    } catch (error) {
      Alert.alert('Link Failed', getErrorMessage(error));
    } finally {
      setLinking(false);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <LoadingOverlay visible={vendorLoading && !vendor} />

      {vendor ? (
        <>
          <View style={[styles.headerCard, shadows.sm as ViewStyle]}>
            <Text style={styles.businessName}>{vendor.business_name}</Text>
            {vendor.login_email ? (
              <Text style={styles.meta}>Login: {vendor.login_email}</Text>
            ) : (
              <Text style={styles.metaWarning}>No login linked yet</Text>
            )}
            {vendor.phone ? <Text style={styles.meta}>Phone: {vendor.phone}</Text> : null}
            {vendor.address ? <Text style={styles.meta}>Address: {vendor.address}</Text> : null}
            <Text style={styles.meta}>
              Onboarded: {new Date(vendor.created_at).toLocaleDateString('en-IN')}
            </Text>
          </View>

          {!vendor.login_email || showLinkForm ? (
            <View style={[styles.card, shadows.sm as ViewStyle]}>
              <Text style={styles.sectionTitle}>Link Existing Login</Text>
              <Text style={styles.hint}>
                If you created the login manually in Supabase Auth, enter the email here to link it.
              </Text>
              <AppInput
                label="Vendor Login Email"
                value={linkEmail}
                onChangeText={setLinkEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <AppButton
                variant="outline"
                onPress={handleLinkLogin}
                loading={linking}
                icon="link-variant"
              >
                Link Login to Vendor
              </AppButton>
            </View>
          ) : (
            <AppButton variant="outline" icon="link-variant" onPress={() => setShowLinkForm(true)}>
              Link Another Login
            </AppButton>
          )}

          <AdminVendorReportsPanel vendor={vendor} />
        </>
      ) : null}
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
  headerCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  businessName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f3460',
  },
  meta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  metaWarning: {
    fontSize: 14,
    color: colors.pending,
    marginTop: 4,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f3460',
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
});
