import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEnquiry,
  deleteEnquiry,
  fetchEnquiries,
  updateEnquiryStatus,
} from '../api/enquiriesApi';
import { CreateEnquiryInput, EnquiryStatus } from '@/types/enquiry';

export function useEnquiries() {
  return useQuery({
    queryKey: ['enquiries'],
    queryFn: fetchEnquiries,
  });
}

export function useCreateEnquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEnquiryInput) => createEnquiry(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
    },
  });
}

export function useUpdateEnquiryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EnquiryStatus }) =>
      updateEnquiryStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
    },
  });
}

export function useDeleteEnquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEnquiry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
    },
  });
}
