import { useMemo, useState } from 'react';
import { StyleSheet, FlatList, RefreshControl, View } from 'react-native';
import { Searchbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { BookingCard } from '@/features/bookings/components/BookingCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { useYearBookings } from '@/features/reports/hooks/useReports';
import { openBookingDetails } from '@/utils/bookingNavigation';
import { Booking } from '@/types/booking';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

function bookingMatchesQuery(booking: Booking, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    booking.booking_number.toLowerCase().includes(q) ||
    booking.customer_name.toLowerCase().includes(q) ||
    booking.mobile.toLowerCase().includes(q) ||
    booking.murti_name.toLowerCase().includes(q)
  );
}

export default function YearBookingsScreen() {
  const router = useRouter();
  const year = new Date().getFullYear();
  const { data: bookings, isLoading, isRefetching, refetch } = useYearBookings(year);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBookings = useMemo(() => {
    const list = bookings ?? [];
    const q = searchQuery.trim();
    if (!q) return list;
    return list.filter((b) => bookingMatchesQuery(b, q));
  }, [bookings, searchQuery]);

  const hasSearch = searchQuery.trim().length > 0;

  return (
    <ScreenContainer title={`${year} Bookings`}>
      <LoadingOverlay visible={isLoading && !bookings} />
      <View style={styles.searchWrap}>
        <Searchbar
          placeholder="Search by booking no / name / phone / murti"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.search}
          inputStyle={styles.searchInput}
        />
      </View>
      <FlatList
        style={styles.listFlex}
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        extraData={searchQuery}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => (
          <BookingCard
            booking={item}
            index={index}
            showDate
            onPress={() => openBookingDetails(router, item.id, 'year')}
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              message={
                hasSearch
                  ? 'No bookings match your search'
                  : `No bookings found for ${year}`
              }
              icon={hasSearch ? 'magnify' : 'calendar-blank'}
            />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            colors={[colors.royalRed]}
            tintColor={colors.royalRed}
          />
        }
        contentContainerStyle={styles.list}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  search: {
    elevation: 0,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    height: 44,
  },
  searchInput: {
    minHeight: 0,
    fontSize: 14,
  },
  listFlex: {
    flex: 1,
  },
  list: {
    paddingBottom: 32,
    flexGrow: 1,
  },
});
