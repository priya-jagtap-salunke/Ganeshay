import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCustomerList, fetchYearBookings } from '../api/reportsApi';
import {
  createExpense,
  deleteExpense,
  fetchExpenses,
  fetchYearExpenses,
} from '../api/expensesApi';
import { CreateExpenseInput } from '@/types/expense';

export function useYearBookings(year: number) {
  return useQuery({
    queryKey: ['reports', 'bookings', year],
    queryFn: () => fetchYearBookings(year),
  });
}

export function useCustomerList() {
  return useQuery({
    queryKey: ['reports', 'customers'],
    queryFn: fetchCustomerList,
  });
}

export function useExpenses() {
  return useQuery({
    queryKey: ['reports', 'expenses'],
    queryFn: fetchExpenses,
  });
}

export function useYearExpenses(year: number) {
  return useQuery({
    queryKey: ['reports', 'expenses', year],
    queryFn: () => fetchYearExpenses(year),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateExpenseInput) => createExpense(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'expenses'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'expenses'] });
    },
  });
}
