import { useQuery } from '@tanstack/react-query';
import { fetchSalesAnalystInsight } from '../api/salesAnalystApi';

export function useSalesAnalyst(lookbackDays = 180) {
  return useQuery({
    queryKey: ['ai', 'sales-analyst', lookbackDays],
    queryFn: () => fetchSalesAnalystInsight(lookbackDays),
    staleTime: 60_000,
  });
}
