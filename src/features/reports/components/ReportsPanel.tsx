import { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Alert,
  ViewStyle,
  Pressable,
  ScrollView,
} from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppButton } from '@/components/ui/AppButton';
import { AppSelect } from '@/components/ui/AppSelect';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { useDeleteBooking } from '@/features/bookings/hooks/useBookings';
import { useYearBookings, useCustomerList, useYearExpenses } from '../hooks/useReports';
import {
  buildYearlySummary,
  getAvailableReportYears,
  CustomerRecord,
} from '../api/reportsApi';
import {
  exportCustomerListExcel,
  exportYearBookingsExcel,
  formatReportDate,
} from '../utils/exportExcel';
import { ManageExpensesCard } from './ManageExpensesCard';
import { formatCurrency } from '@/utils/currency';
import { openBookingDetails } from '@/utils/bookingNavigation';
import { Booking } from '@/types/booking';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';
import { getErrorMessage } from '@/utils/errors';

type ReportsTab = 'overview' | 'bookings' | 'customers' | 'expenses';

const REPORT_TABS: {
  key: ReportsTab;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { key: 'overview', label: 'Overview', icon: 'chart-box-outline' },
  { key: 'bookings', label: 'Bookings', icon: 'calendar-check' },
  { key: 'customers', label: 'Customers', icon: 'account-group' },
  { key: 'expenses', label: 'Expenses', icon: 'cash-minus' },
];

function ReportCard({
  title,
  icon,
  children,
}: {
  title?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, shadows.sm as ViewStyle]}>
      {title ? (
        <View style={styles.cardTitleRow}>
          {icon ? (
            <MaterialCommunityIcons
              name={icon}
              size={18}
              color={colors.royalRed}
              style={styles.cardTitleIcon}
            />
          ) : null}
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function ReportActions({
  onDownload,
  onRefresh,
  downloading,
  downloadDisabled,
  downloadLabel = 'Download Excel',
}: {
  onDownload: () => void;
  onRefresh: () => void;
  downloading: boolean;
  downloadDisabled: boolean;
  downloadLabel?: string;
}) {
  return (
    <View style={styles.actionsRow}>
      <AppButton
        icon="download"
        onPress={onDownload}
        loading={downloading}
        disabled={downloadDisabled || downloading}
        style={styles.actionPrimary}
        contentStyle={styles.actionContent}
        labelStyle={styles.actionLabel}
      >
        {downloadLabel}
      </AppButton>
      <AppButton
        icon="refresh"
        variant="outline"
        onPress={onRefresh}
        style={styles.actionSecondary}
        contentStyle={styles.actionContent}
        labelStyle={styles.actionLabel}
      >
        Refresh
      </AppButton>
    </View>
  );
}

function YearBookingRow({
  booking,
  onPress,
}: {
  booking: Booking;
  onPress: () => void;
}) {
  const deleteBooking = useDeleteBooking();
  const isDeleting =
    deleteBooking.isPending && deleteBooking.variables === booking.id;

  const handleDelete = () => {
    Alert.alert(
      'Delete Booking',
      `Are you sure you want to delete ${booking.booking_number}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteBooking.mutate(booking.id, {
              onError: (err) => Alert.alert('Error', getErrorMessage(err)),
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.bookingRow}>
      <IconButton
        icon="delete-outline"
        size={20}
        iconColor={colors.error}
        onPress={handleDelete}
        disabled={isDeleting}
        accessibilityLabel={`Delete booking ${booking.booking_number}`}
        style={styles.bookingDeleteButton}
      />
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.bookingRowBody, pressed && styles.pressed]}
      >
        <View style={styles.bookingHeader}>
          <Text style={styles.bookingId}>{booking.booking_number}</Text>
          <Text
            style={[
              styles.statusBadge,
              booking.status === 'Delivered'
                ? styles.statusDelivered
                : styles.statusPending,
            ]}
          >
            {booking.status}
          </Text>
        </View>
        <Text style={styles.customerName}>{booking.customer_name}</Text>
        <Text style={styles.bookingMeta}>Mobile: {booking.mobile}</Text>
        <Text style={styles.bookingMeta}>
          Date: {formatReportDate(booking.booking_date)}
        </Text>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amountValue}>{formatCurrency(booking.price)}</Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Advance</Text>
          <Text style={styles.amountValue}>{formatCurrency(booking.advance)}</Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Pending</Text>
          <Text style={[styles.amountValue, styles.pendingValue]}>
            {formatCurrency(booking.pending)}
          </Text>
        </View>
        {booking.payment_mode ? (
          <Text style={styles.bookingMeta}>Payment: {booking.payment_mode}</Text>
        ) : null}
      </Pressable>
    </View>
  );
}

function CustomerRow({ customer }: { customer: CustomerRecord }) {
  return (
    <View style={styles.customerRow}>
      <Text style={styles.customerName}>{customer.customerName}</Text>
      <Text style={styles.bookingMeta}>Mobile: {customer.mobile}</Text>
      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Bookings</Text>
        <Text style={styles.amountValue}>{customer.totalBookings}</Text>
      </View>
      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Total spent</Text>
        <Text style={styles.amountValue}>
          {formatCurrency(customer.totalSpent)}
        </Text>
      </View>
      <Text style={styles.bookingMeta}>
        Last booking: {formatReportDate(customer.lastBookingDate)} (
        {customer.lastBookingId})
      </Text>
    </View>
  );
}

function ReportsTabBar({
  activeTab,
  onChange,
}: {
  activeTab: ReportsTab;
  onChange: (tab: ReportsTab) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabBarContent}
      style={styles.tabBar}
    >
      {REPORT_TABS.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.tabChip,
              active && styles.tabChipActive,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              name={tab.icon}
              size={16}
              color={active ? colors.white : colors.royalRed}
            />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ReportsPanel() {
  const router = useRouter();
  const years = getAvailableReportYears();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [activeTab, setActiveTab] = useState<ReportsTab>('overview');
  const [exportingBookings, setExportingBookings] = useState(false);
  const [exportingCustomers, setExportingCustomers] = useState(false);

  const yearNum = Number(year);

  const {
    data: yearBookings,
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = useYearBookings(yearNum);

  const {
    data: customers,
    isLoading: customersLoading,
    refetch: refetchCustomers,
  } = useCustomerList();

  const { data: yearExpenses } = useYearExpenses(yearNum);

  const summary = useMemo(
    () => buildYearlySummary(yearNum, yearBookings ?? [], yearExpenses ?? []),
    [yearNum, yearBookings, yearExpenses]
  );

  const yearOptions = years.map((y) => ({
    label: String(y),
    value: String(y),
  }));

  const handleExportBookings = async () => {
    if (!yearBookings?.length) {
      Alert.alert('No Data', `No bookings found for ${year}.`);
      return;
    }
    setExportingBookings(true);
    try {
      await exportYearBookingsExcel(yearBookings, yearNum);
    } catch (err) {
      Alert.alert('Export Failed', getErrorMessage(err));
    } finally {
      setExportingBookings(false);
    }
  };

  const handleExportCustomers = async () => {
    if (!customers?.length) {
      Alert.alert('No Data', 'No customers found to export.');
      return;
    }
    setExportingCustomers(true);
    try {
      await exportCustomerListExcel(customers);
    } catch (err) {
      Alert.alert('Export Failed', getErrorMessage(err));
    } finally {
      setExportingCustomers(false);
    }
  };

  return (
    <View>
      <LoadingOverlay visible={bookingsLoading && !yearBookings} />

      <ReportCard>
        <View style={styles.yearHeader}>
          <MaterialCommunityIcons
            name="calendar-month"
            size={18}
            color={colors.royalRed}
          />
          <Text style={styles.yearHeaderLabel}>Report year</Text>
        </View>
        <AppSelect
          label="Year"
          value={year}
          options={yearOptions}
          onChange={setYear}
        />
      </ReportCard>

      <ReportsTabBar activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' ? (
        <ReportCard title={`${year} Summary`} icon="chart-box-outline">
          <SummaryRow
            label="Total Bookings"
            value={String(summary.totalBookings)}
          />
          <SummaryRow
            label="Total Sales"
            value={formatCurrency(summary.totalSales)}
          />
          <SummaryRow
            label="Advance Collected"
            value={formatCurrency(summary.advanceCollected)}
          />
          <SummaryRow
            label="Pending Amount"
            value={formatCurrency(summary.pendingAmount)}
          />
          <SummaryRow
            label="Delivered"
            value={String(summary.deliveredCount)}
          />
          <SummaryRow
            label="Total Expenses"
            value={formatCurrency(summary.totalExpenses)}
          />
          <SummaryRow label="Profit" value={formatCurrency(summary.profit)} />
        </ReportCard>
      ) : null}

      {activeTab === 'bookings' ? (
        <ReportCard title={`${year} Bookings`} icon="calendar-check">
          <ReportActions
            onDownload={handleExportBookings}
            onRefresh={() => refetchBookings()}
            downloading={exportingBookings}
            downloadDisabled={!yearBookings?.length}
            downloadLabel="Download Excel"
          />

          {yearBookings && yearBookings.length > 0 ? (
            <View style={styles.bookingsList}>
              {yearBookings.map((booking) => (
                <YearBookingRow
                  key={booking.id}
                  booking={booking}
                  onPress={() =>
                    openBookingDetails(router, booking.id, 'reports')
                  }
                />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No bookings found for {year}.</Text>
          )}
        </ReportCard>
      ) : null}

      {activeTab === 'customers' ? (
        <ReportCard title="Customers" icon="account-group">
          <Text style={styles.hint}>
            Unique customers across all bookings.
          </Text>
          <SummaryRow
            label="Unique Customers"
            value={customersLoading ? '…' : String(customers?.length ?? 0)}
          />

          <ReportActions
            onDownload={handleExportCustomers}
            onRefresh={() => refetchCustomers()}
            downloading={exportingCustomers}
            downloadDisabled={customersLoading || !customers?.length}
            downloadLabel="Download Excel"
          />

          {customers && customers.length > 0 ? (
            <View style={styles.bookingsList}>
              {customers.map((customer) => (
                <CustomerRow
                  key={`${customer.mobile}-${customer.customerName}`}
                  customer={customer}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              {customersLoading
                ? 'Loading customers…'
                : 'No customers found yet.'}
            </Text>
          )}
        </ReportCard>
      ) : null}

      {activeTab === 'expenses' ? (
        <ReportCard title={`${year} Expenses`} icon="cash-minus">
          <ManageExpensesCard year={yearNum} />
        </ReportCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    elevation: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitleIcon: {
    marginRight: spacing.xs,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.royalRed,
    flex: 1,
  },
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  yearHeaderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tabBar: {
    marginBottom: spacing.sm,
    marginHorizontal: spacing.md,
  },
  tabBarContent: {
    gap: spacing.xs,
    paddingVertical: 2,
    paddingRight: spacing.sm,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.grayLight,
  },
  tabChipActive: {
    backgroundColor: colors.royalRed,
    borderColor: colors.royalRed,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.white,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.grayLight,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    flexShrink: 1,
    paddingRight: spacing.sm,
  },
  summaryValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
  },
  actionsRow: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionPrimary: {
    flex: 1.4,
    marginVertical: 0,
  },
  actionSecondary: {
    flex: 1,
    marginVertical: 0,
  },
  actionContent: {
    paddingVertical: 2,
    minHeight: 44,
  },
  actionLabel: {
    fontSize: 13,
    marginVertical: 0,
  },
  bookingsList: {
    marginVertical: spacing.sm,
    gap: spacing.sm,
  },
  bookingRow: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingRight: spacing.sm + 2,
    paddingLeft: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bookingDeleteButton: {
    margin: 0,
  },
  bookingRowBody: {
    flex: 1,
    paddingLeft: spacing.xs,
  },
  customerRow: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
  },
  pressed: {
    opacity: 0.92,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  bookingId: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.royalRed,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  statusDelivered: {
    backgroundColor: colors.successContainer,
    color: colors.success,
  },
  statusPending: {
    backgroundColor: colors.pendingContainer,
    color: colors.deepSaffronDark,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  bookingMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 1,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  amountLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pendingValue: {
    color: colors.deepSaffron,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginVertical: spacing.sm,
    fontSize: 13,
  },
});
