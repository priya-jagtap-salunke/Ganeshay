import { useQuery } from '@tanstack/react-query';
import { fetchIsSuperAdmin } from '../api/adminApi';

export function useIsSuperAdmin() {
  return useQuery({
    queryKey: ['is-super-admin'],
    queryFn: fetchIsSuperAdmin,
    staleTime: 60_000,
  });
}
