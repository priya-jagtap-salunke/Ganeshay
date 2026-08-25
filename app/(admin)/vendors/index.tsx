import { FlatList, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppButton } from '@/components/ui/AppButton';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { fetchAllVendors } from '@/features/admin/api/adminApi';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { shadows } from '@/theme/shadows';

export default function AdminVendorsScreen() {
  const router = useRouter();
  const { data: vendors, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-vendors'],
    queryFn: fetchAllVendors,
  });

  return (
    <View style={styles.page}>
      <LoadingOverlay visible={isLoading && !vendors} />

      <View style={styles.toolbar}>
        <AppButton icon="account-plus" onPress={() => router.push('/(admin)/vendors/new')}>
          Add Vendor
        </AppButton>
      </View>

      <FlatList
        data={vendors ?? []}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.empty}>No vendors yet. Add your first stall vendor.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(admin)/vendors/${item.id}`)}
            style={[styles.card, shadows.sm as ViewStyle]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.businessName}>{item.business_name}</Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: item.linked ? colors.success : colors.pending },
                ]}
              >
                <Text style={styles.badgeText}>{item.linked ? 'Linked' : 'No Login'}</Text>
              </View>
            </View>

            {item.login_email ? (
              <Text style={styles.meta}>Login: {item.login_email}</Text>
            ) : null}
            {item.phone ? <Text style={styles.meta}>Phone: {item.phone}</Text> : null}
            <Text style={styles.meta}>Prefix: {item.booking_prefix}</Text>

            <Text style={styles.viewReport}>View report →</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
  toolbar: {
    padding: spacing.md,
    paddingBottom: 0,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.xl,
    fontSize: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f3460',
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  meta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  viewReport: {
    marginTop: spacing.sm,
    color: colors.royalRed,
    fontWeight: '700',
    fontSize: 14,
  },
});
