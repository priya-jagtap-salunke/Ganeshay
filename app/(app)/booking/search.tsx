import { useState } from 'react';
import { StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { AppInput } from '@/components/ui/AppInput';
import { BookingCard } from '@/features/bookings/components/BookingCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useBookingSearch } from '@/features/bookings/hooks/useBookingSearch';
import { useBookedAgainIds } from '@/features/bookings/hooks/useBookedAgainIds';
import { openBookingDetails } from '@/utils/bookingNavigation';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { results, isSearching } = useBookingSearch(query);
  const { data: bookedAgainIds } = useBookedAgainIds();

  return (
      <ScreenContainer title="Search Booking">
        <AppInput
          label="Search by Booking No / Name / Phone"
          value={query}
          onChangeText={setQuery}
          autoFocus
          style={styles.search}
        />
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          extraData={bookedAgainIds}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              bookedAgain={bookedAgainIds?.has(item.id) ?? false}
              onPress={() => openBookingDetails(router, item.id, 'search')}
            />
          )}
          ListEmptyComponent={
            query.length >= 1 && !isSearching ? (
              <EmptyState message="No bookings found" />
            ) : query.length < 1 ? (
              <EmptyState message="Type at least 1 character to search" icon="magnify" />
            ) : null
          }
          contentContainerStyle={styles.list}
        />
      </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  search: {
    margin: 16,
    marginBottom: 8,
  },
  list: {
    paddingBottom: 32,
  },
});
