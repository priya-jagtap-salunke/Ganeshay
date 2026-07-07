import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBooking,
  deleteBooking,
  fetchBookingById,
  fetchNextBookingNumber,
  markDelivered,
  updateBooking,
  updateBookingFromForm,
} from '../api/bookingsApi';
import { BookingSchemaType } from '../schemas/bookingSchema';
import { Booking } from '@/types/booking';

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => fetchBookingById(id),
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: BookingSchemaType) => {
      const bookingNumber = await fetchNextBookingNumber();
      return createBooking(formData, bookingNumber);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Booking>;
    }) => updateBooking(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export function useMarkDelivered() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      booking,
      amountReceived,
    }: {
      booking: Booking;
      amountReceived: number;
    }) => markDelivered(booking, amountReceived),
    onSuccess: (_, { booking }) => {
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateBookingForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: BookingSchemaType }) =>
      updateBookingFromForm(id, formData),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
