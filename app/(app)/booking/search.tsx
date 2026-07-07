import { useState } from 'react';
import { StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { AppInput } from '@/components/ui/AppInput';
import { BookingCard } from '@/features/bookings/components/BookingCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useBookingSearch } from '@/features/bookings/hooks/useBookingSearch';
import { openBookingDetails } from '@/utils/bookingNavigation';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { results, isSearching } = useBookingSearch(query);

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
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => openBookingDetails(router, item.id, 'search')}
            />
          )}
          ListEmptyComponent={
            query.length >= 2 && !isSearching ? (
              <EmptyState message="No bookings found" />
            ) : query.length < 2 ? (
              <EmptyState message="Type at least 2 characters to search" icon="magnify" />
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
