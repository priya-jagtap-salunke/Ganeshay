import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { AppButton } from '@/components/ui/AppButton';
import { AppSelect } from '@/components/ui/AppSelect';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import {
  fetchVendorBookings,
  fetchVendorCustomerList,
  fetchVendorExpenses,
  fetchVendorYearBookings,
  getVendorReportYears,
} from '@/features/admin/api/adminApi';
import { buildYearlySummary } from '@/features/reports/api/reportsApi';
import { filterExpensesByYear } from '@/features/reports/api/expensesApi';
import {
  exportCustomerListExcel,
  exportYearBookingsExcel,
  formatReportDate,
} from '@/features/reports/utils/exportExcel';
import { Booking } from '@/types/booking';
import { Vendor } from '@/types/vendor';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errors';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

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

function YearBookingRow({ booking }: { booking: Booking }) {
  return (
    <View style={styles.bookingRow}>
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
      {booking.address ? (
        <Text style={styles.bookingMeta}>Address: {booking.address}</Text>
      ) : null}
      <Text style={styles.bookingMeta}>
        Booking Date: {formatReportDate(booking.booking_date)}
      </Text>
      {booking.delivery_date ? (
        <Text style={styles.bookingMeta}>
          Delivery Date: {formatReportDate(booking.delivery_date)}
        </Text>
      ) : null}
      <Text style={styles.bookingMeta}>
        Murti: {booking.murti_name}
        {booking.murti_size ? ` (${booking.murti_size})` : ''}
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
      {booking.notes ? (
        <Text style={styles.bookingMeta}>Notes: {booking.notes}</Text>
      ) : null}
    </View>
  );
}

interface AdminVendorReportsPanelProps {
  vendor: Vendor;
}

export function AdminVendorReportsPanel({ vendor }: AdminVendorReportsPanelProps) {
  const reportYears = useMemo(
    () => getVendorReportYears(vendor.created_at),
    [vendor.created_at]
  );
  const defaultYear = String(reportYears[reportYears.length - 1] ?? new Date().getFullYear());
  const [year, setYear] = useState(defaultYear);
  const [exportingBookings, setExportingBookings] = useState(false);
  const [exportingYearCustomers, setExportingYearCustomers] = useState(false);
  const [exportingAllCustomers, setExportingAllCustomers] = useState(false);

  const yearNum = Number(year);
  const exportOptions = { vendorName: vendor.business_name };

  const {
    data: yearBookings,
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ['admin-vendor-year-bookings', vendor.id, yearNum],
    queryFn: () => fetchVendorYearBookings(vendor.id, yearNum),
    enabled: Boolean(vendor.id),
  });

  const {
    data: allBookings,
    isLoading: allBookingsLoading,
  } = useQuery({
    queryKey: ['admin-vendor-all-bookings', vendor.id],
    queryFn: () => fetchVendorBookings(vendor.id),
    enabled: Boolean(vendor.id),
  });

  const {
    data: allExpenses,
    isLoading: expensesLoading,
  } = useQuery({
    queryKey: ['admin-vendor-expenses', vendor.id],
    queryFn: () => fetchVendorExpenses(vendor.id),
    enabled: Boolean(vendor.id),
  });

  const yearExpenses = useMemo(
    () => filterExpensesByYear(allExpenses ?? [], yearNum),
    [allExpenses, yearNum]
  );

  const yearSummaries = useMemo(() => {
    return reportYears.map((reportYear) => {
      const bookingsForYear = (allBookings ?? []).filter((booking) => {
        return new Date(booking.booking_date).getFullYear() === reportYear;
      });
      const expensesForYear = filterExpensesByYear(allExpenses ?? [], reportYear);
      return buildYearlySummary(reportYear, bookingsForYear, expensesForYear);
    });
  }, [allBookings, allExpenses, reportYears]);

  const yearlySummary = useMemo(
    () => buildYearlySummary(yearNum, yearBookings ?? [], yearExpenses),
    [yearNum, yearBookings, yearExpenses]
  );

  const {
    data: yearCustomers,
    isLoading: yearCustomersLoading,
    refetch: refetchYearCustomers,
  } = useQuery({
    queryKey: ['admin-vendor-customers', vendor.id, yearNum],
    queryFn: () => fetchVendorCustomerList(vendor.id, yearNum),
    enabled: Boolean(vendor.id),
  });

  const {
    data: allCustomers,
    isLoading: allCustomersLoading,
    refetch: refetchAllCustomers,
  } = useQuery({
    queryKey: ['admin-vendor-customers-all', vendor.id],
    queryFn: () => fetchVendorCustomerList(vendor.id),
    enabled: Boolean(vendor.id),
  });

  const yearOptions = reportYears.map((y) => ({
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
      await exportYearBookingsExcel(yearBookings, yearNum, exportOptions);
    } catch (error) {
      Alert.alert('Export Failed', getErrorMessage(error));
    } finally {
      setExportingBookings(false);
    }
  };

  const handleExportYearCustomers = async () => {
    if (!yearCustomers?.length) {
      Alert.alert('No Data', `No customers found for ${year}.`);
      return;
    }

    setExportingYearCustomers(true);
    try {
      await exportCustomerListExcel(yearCustomers, {
        ...exportOptions,
        year: yearNum,
      });
    } catch (error) {
      Alert.alert('Export Failed', getErrorMessage(error));
    } finally {
      setExportingYearCustomers(false);
    }
  };

  const handleExportAllCustomers = async () => {
    if (!allCustomers?.length) {
      Alert.alert('No Data', 'No customers found for this vendor yet.');
      return;
    }

    setExportingAllCustomers(true);
    try {
      await exportCustomerListExcel(allCustomers, exportOptions);
    } catch (error) {
      Alert.alert('Export Failed', getErrorMessage(error));
    } finally {
      setExportingAllCustomers(false);
    }
  };

  return (
    <View>
      <LoadingOverlay visible={bookingsLoading && !yearBookings} />

      <ReportCard title="Year-wise Sales Overview">
        <Text style={styles.hint}>
          Reports available from {reportYears[0]} to {reportYears[reportYears.length - 1]} since
          vendor onboarding.
        </Text>
        {yearSummaries.map((summary) => (
          <Pressable
            key={summary.year}
            onPress={() => setYear(String(summary.year))}
            style={[
              styles.yearOverviewRow,
              summary.year === yearNum && styles.yearOverviewRowActive,
            ]}
          >
            <Text style={styles.yearOverviewYear}>{summary.year}</Text>
            <Text style={styles.yearOverviewMeta}>
              {summary.totalBookings} bookings · {formatCurrency(summary.totalSales)} ·
              profit {formatCurrency(summary.profit)}
            </Text>
          </Pressable>
        ))}
        {allBookingsLoading || expensesLoading ? (
          <Text style={styles.hint}>Loading year-wise totals…</Text>
        ) : null}
      </ReportCard>

      <ReportCard title={`${year} Sales Report`}>
        <AppSelect
          label="Select Year"
          value={year}
          options={yearOptions}
          onChange={setYear}
        />

        <SummaryRow label="Total Bookings" value={String(yearlySummary?.totalBookings ?? 0)} />
        <SummaryRow label="Total Sales" value={formatCurrency(yearlySummary?.totalSales ?? 0)} />
        <SummaryRow
          label="Advance Collected"
          value={formatCurrency(yearlySummary?.advanceCollected ?? 0)}
        />
        <SummaryRow
          label="Pending Amount"
          value={formatCurrency(yearlySummary?.pendingAmount ?? 0)}
        />
        <SummaryRow label="Delivered" value={String(yearlySummary?.deliveredCount ?? 0)} />
        <SummaryRow
          label="Total Expenses"
          value={formatCurrency(yearlySummary?.totalExpenses ?? 0)}
        />
        <SummaryRow label="Profit" value={formatCurrency(yearlySummary?.profit ?? 0)} />

        {yearBookings && yearBookings.length > 0 ? (
          <View style={styles.bookingsList}>
            {yearBookings.map((booking) => (
              <YearBookingRow key={booking.id} booking={booking} />
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
        <AppButton icon="refresh" variant="outline" onPress={() => refetchBookings()}>
          Refresh Bookings
        </AppButton>
      </ReportCard>

      <ReportCard title={`${year} Customer List`}>
        <Text style={styles.hint}>
          Customers who booked with this vendor in {year}. Download as Excel.
        </Text>
        <SummaryRow
          label="Unique Customers"
          value={yearCustomersLoading ? '…' : String(yearCustomers?.length ?? 0)}
        />
        <AppButton
          icon="account-group"
          onPress={handleExportYearCustomers}
          loading={exportingYearCustomers}
          disabled={yearCustomersLoading || exportingYearCustomers}
        >
          Download {year} Customer List (Excel)
        </AppButton>
        <AppButton icon="refresh" variant="outline" onPress={() => refetchYearCustomers()}>
          Refresh {year} Customers
        </AppButton>
      </ReportCard>

      <ReportCard title="All-time Customer List">
        <Text style={styles.hint}>
          Complete customer list across every year since this vendor was onboarded.
        </Text>
        <SummaryRow
          label="Total Unique Customers"
          value={allCustomersLoading ? '…' : String(allCustomers?.length ?? 0)}
        />
        <AppButton
          icon="account-group"
          onPress={handleExportAllCustomers}
          loading={exportingAllCustomers}
          disabled={allCustomersLoading || exportingAllCustomers}
          variant="secondary"
        >
          Download All Customers (Excel)
        </AppButton>
        <AppButton icon="refresh" variant="outline" onPress={() => refetchAllCustomers()}>
          Refresh All Customers
        </AppButton>
      </ReportCard>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f3460',
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  yearOverviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.goldLight,
    marginBottom: spacing.xs,
    backgroundColor: colors.warmIvory,
  },
  yearOverviewRowActive: {
    borderColor: '#0f3460',
    backgroundColor: '#eef2ff',
  },
  yearOverviewYear: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f3460',
  },
  yearOverviewMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: spacing.sm,
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
