import { supabase } from '@/lib/supabase';
import { getErrorMessage, getSupabaseConfigError } from '@/utils/errors';
import { SalesAnalystInsight } from '../types';

type RpcSalesPayload = {
  lookbackDays?: number;
  totalBookings?: number;
  totalRevenue?: number;
  advanceCollected?: number;
  pendingAmount?: number;
  avgBookingValue?: number;
  topSellingIdol?: { name: string; count: number; revenue: number } | null;
  mostProfitable?: { name: string; count: number; revenue: number } | null;
  repeatCustomers?: SalesAnalystInsight['repeatCustomers'];
  slowMoving?: SalesAnalystInsight['slowMoving'];
  revenueTrend?: SalesAnalystInsight['revenueTrend'];
  note?: string;
};

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapRpcPayload(raw: RpcSalesPayload): SalesAnalystInsight {
  const top = raw.topSellingIdol;
  const profitable = raw.mostProfitable;

  return {
    lookbackDays: asNumber(raw.lookbackDays) || 180,
    totalBookings: asNumber(raw.totalBookings),
    totalRevenue: asNumber(raw.totalRevenue),
    advanceCollected: asNumber(raw.advanceCollected),
    pendingAmount: asNumber(raw.pendingAmount),
    avgBookingValue: asNumber(raw.avgBookingValue),
    topSellingIdol: top?.name
      ? {
          name: String(top.name),
          count: asNumber(top.count),
          revenue: asNumber(top.revenue),
        }
      : null,
    mostProfitable: profitable?.name
      ? {
          name: String(profitable.name),
          count: asNumber(profitable.count),
          revenue: asNumber(profitable.revenue),
        }
      : null,
    repeatCustomers: {
      count: asNumber(raw.repeatCustomers?.count),
      totalCustomers: asNumber(raw.repeatCustomers?.totalCustomers),
      top: Array.isArray(raw.repeatCustomers?.top)
        ? raw.repeatCustomers!.top.map((c) => ({
            name: String(c.name ?? ''),
            mobileMasked: String(c.mobileMasked ?? '****'),
            bookings: asNumber(c.bookings),
            spent: asNumber(c.spent),
          }))
        : [],
    },
    slowMoving: Array.isArray(raw.slowMoving)
      ? raw.slowMoving.map((s) => ({
          label: String(s.label ?? ''),
          count: asNumber(s.count),
          lastBooked: s.lastBooked ? String(s.lastBooked) : null,
        }))
      : [],
    revenueTrend: Array.isArray(raw.revenueTrend)
      ? raw.revenueTrend.map((m) => ({
          month: String(m.month ?? ''),
          revenue: asNumber(m.revenue),
          bookings: asNumber(m.bookings),
        }))
      : [],
    note:
      raw.note ??
      'Insights from your bookings only (vendor-scoped). Stock means booking demand by murti/size — not live inventory.',
  };
}

/**
 * AI-hub-only sales insight via server-side RPC (`ai_get_sales_analysis`).
 * Does NOT use ReportsPanel / reportsApi / Excel export.
 * Returns compact aggregates — no unbounded booking dumps to the client.
 */
export async function fetchSalesAnalystInsight(
  lookbackDays = 180
): Promise<SalesAnalystInsight> {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);

  const days = Math.min(Math.max(lookbackDays, 30), 730);

  const { data, error } = await supabase.rpc('ai_get_sales_analysis', {
    p_days: days,
  });

  if (error) throw new Error(getErrorMessage(error));
  if (!data || typeof data !== 'object') {
    throw new Error('Sales analysis returned an empty response.');
  }

  return mapRpcPayload(data as RpcSalesPayload);
}

export function formatInr(amount: number): string {
  return `₹${Number(amount || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
}
