import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { StatCard } from '@/components/ui/StatCard';
import { AppButton } from '@/components/ui/AppButton';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { fetchPlatformOverview } from '@/features/admin/api/adminApi';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { elevation } from '@/theme/shadows';

export default function AdminHomeScreen() {
  const router = useRouter();
  const { data: overview, isLoading } = useQuery({
    queryKey: ['admin-platform-overview'],
    queryFn: fetchPlatformOverview,
  });

  return (
    <ScrollView
      style={[styles.page, { backgroundColor: colors.adminSurface }]}
      contentContainerStyle={styles.content}
    >
      <LoadingOverlay visible={isLoading && !overview} />

      <View
        style={[
          styles.hero,
          elevation.level1 as ViewStyle,
          { backgroundColor: colors.adminPrimary, borderRadius: radius.xl },
        ]}
      >
        <Text
          variant="headlineSmall"
          style={{ color: colors.adminOnPrimary, fontWeight: '500' }}
        >
          Platform Overview
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: colors.adminOnPrimary, opacity: 0.85, marginTop: 4 }}
        >
          Manage all stall vendors from one place
        </Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard
          compact
          width={150}
          title="Total Vendors"
          value={overview?.vendorCount ?? 0}
          icon="store"
          accentColor={colors.adminPrimary}
          index={0}
        />
        <StatCard
          compact
          width={150}
          title="Linked Logins"
          value={overview?.linkedVendorCount ?? 0}
          icon="link-variant"
          accentColor={colors.success}
          index={1}
        />
      </View>

      <View
        style={[
          styles.actionsCard,
          elevation.level1 as ViewStyle,
          {
            backgroundColor: colors.white,
            borderRadius: radius.lg,
          },
        ]}
      >
        <Text
          variant="titleMedium"
          style={{ color: colors.adminPrimary, marginBottom: spacing.sm }}
        >
          Quick Actions
        </Text>

        <AppButton
          icon="account-plus"
          onPress={() => router.push('/(admin)/vendors/new')}
          buttonColor={colors.adminPrimary}
        >
          Add New Vendor
        </AppButton>

        <AppButton
          variant="outline"
          icon="format-list-bulleted"
          onPress={() => router.push('/(admin)/vendors')}
        >
          View All Vendors
        </AppButton>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  hero: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  actionsCard: {
    padding: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
