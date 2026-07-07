import { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Alert,
  ViewStyle,
  Pressable,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { AppButton } from '@/components/ui/AppButton';
import { AppSelect } from '@/components/ui/AppSelect';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { useYearBookings, useCustomerList } from '../hooks/useReports';
import {
  buildYearlySummary,
  getAvailableReportYears,
} from '../api/reportsApi';
import {
  exportCustomerListExcel,
  exportYearBookingsExcel,
  formatReportDate,
} from '../utils/exportExcel';
import { formatCurrency } from '@/utils/currency';
import { openBookingDetails } from '@/utils/bookingNavigation';
import { Booking } from '@/types/booking';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';
import { getErrorMessage } from '@/utils/errors';

function ReportCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, shadows.sm as ViewStyle]}>
      <Text style={styles.cardTitle}>{title}</Text>
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

function YearBookingRow({
  booking,
  onPress,
}: {
  booking: Booking;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.bookingRow, pressed && styles.pressed]}
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
  );
}

export function ReportsPanel() {
  const router = useRouter();
  const years = getAvailableReportYears();
  const [year, setYear] = useState(String(new Date().getFullYear()));
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

  const summary = useMemo(
    () => buildYearlySummary(yearNum, yearBookings ?? []),
    [yearNum, yearBookings]
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

      <ReportCard title={`${year} Bookings`}>
        <AppSelect
          label="Select Year"
          value={year}
          options={yearOptions}
          onChange={setYear}
        />

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

        {yearBookings && yearBookings.length > 0 ? (
          <View style={styles.bookingsList}>
            {yearBookings.map((booking) => (
              <YearBookingRow
                key={booking.id}
                booking={booking}
                onPress={() => openBookingDetails(router, booking.id, 'reports')}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No bookings found for {year}.</Text>
        )}

        <AppButton
          icon="download"
          onPress={handleExportBookings}
          loading={exportingBookings}
          disabled={!yearBookings?.length || exportingBookings}
          variant="secondary"
        >
          Download {year} Bookings (Excel)
        </AppButton>
        <AppButton
          icon="refresh"
          variant="outline"
          onPress={() => refetchBookings()}
        >
          Refresh Bookings
        </AppButton>
      </ReportCard>

      <ReportCard title="Customer List">
        <Text style={styles.hint}>
          Download all customers with name and mobile number in Excel format.
        </Text>
        <SummaryRow
          label="Unique Customers"
          value={customersLoading ? '…' : String(customers?.length ?? 0)}
        />
        <AppButton
          icon="account-group"
          onPress={handleExportCustomers}
          loading={exportingCustomers}
          disabled={customersLoading || exportingCustomers}
        >
          Download Customer List (Excel)
        </AppButton>
        <AppButton
          icon="refresh"
          variant="outline"
          onPress={() => refetchCustomers()}
        >
          Refresh Customers
        </AppButton>
      </ReportCard>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.royalRed,
    marginBottom: spacing.md,
  },
  hint: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
  },
  summaryLabel: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  bookingsList: {
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  bookingRow: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.goldLight,
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
    fontSize: 16,
    fontWeight: '800',
    color: colors.royalRed,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  statusDelivered: {
    backgroundColor: '#E8F5E9',
    color: colors.success,
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
    color: colors.deepSaffron,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  bookingMeta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  amountLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pendingValue: {
    color: colors.deepSaffron,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginVertical: spacing.md,
    fontSize: 15,
  },
});
