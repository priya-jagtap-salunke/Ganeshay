import { formatInr } from '../api/salesAnalystApi';
import { SalesAnalystInsight } from '../types';

/**
 * Short rule-based insight text from the same RPC metrics shown on cards.
 * No LLM — deterministic copy for the free Sales Analyst.
 */
export function buildSalesNarrative(data: SalesAnalystInsight): string {
  const lines: string[] = [];
  const days = data.lookbackDays;

  if (data.totalBookings === 0) {
    return (
      `No bookings in the last ${days} days yet. Once you add bookings, ` +
      `this analyst will highlight top idols, revenue trend, repeat customers, and slow movers.`
    );
  }

  lines.push(
    `Over the last ${days} days you logged ${data.totalBookings} booking${
      data.totalBookings === 1 ? '' : 's'
    } totaling ${formatInr(data.totalRevenue)} ` +
      `(avg ${formatInr(data.avgBookingValue)}). ` +
      `Advance collected ${formatInr(data.advanceCollected)}; ` +
      `pending ${formatInr(data.pendingAmount)}.`
  );

  if (data.topSellingIdol) {
    lines.push(
      `Top-selling idol by count: ${data.topSellingIdol.name} ` +
        `(${data.topSellingIdol.count} bookings, ${formatInr(data.topSellingIdol.revenue)}).`
    );
  }

  if (
    data.mostProfitable &&
    data.mostProfitable.name !== data.topSellingIdol?.name
  ) {
    lines.push(
      `Highest revenue murti: ${data.mostProfitable.name} ` +
        `(${formatInr(data.mostProfitable.revenue)} across ${data.mostProfitable.count} bookings).`
    );
  } else if (data.mostProfitable && !data.topSellingIdol) {
    lines.push(
      `Highest revenue murti: ${data.mostProfitable.name} (${formatInr(data.mostProfitable.revenue)}).`
    );
  }

  const trend = data.revenueTrend;
  if (trend.length >= 2) {
    const prev = trend[trend.length - 2]!;
    const last = trend[trend.length - 1]!;
    const delta = last.revenue - prev.revenue;
    if (delta > 0) {
      lines.push(
        `Revenue trend: ${last.month} is up ${formatInr(delta)} vs ${prev.month}.`
      );
    } else if (delta < 0) {
      lines.push(
        `Revenue trend: ${last.month} is down ${formatInr(Math.abs(delta))} vs ${prev.month}.`
      );
    } else {
      lines.push(
        `Revenue trend: ${last.month} is flat vs ${prev.month} (${formatInr(last.revenue)}).`
      );
    }
  } else if (trend.length === 1) {
    lines.push(
      `Revenue so far in ${trend[0]!.month}: ${formatInr(trend[0]!.revenue)}.`
    );
  }

  const repeat = data.repeatCustomers;
  if (repeat.totalCustomers > 0) {
    const pct = Math.round((repeat.count / repeat.totalCustomers) * 100);
    lines.push(
      `Repeat customers: ${repeat.count} of ${repeat.totalCustomers} (${pct}%).` +
        (repeat.top[0]
          ? ` Top: ${repeat.top[0].name} (${repeat.top[0].bookings}×, ${formatInr(repeat.top[0].spent)}).`
          : '')
    );
  }

  if (data.slowMoving.length > 0) {
    const sample = data.slowMoving
      .slice(0, 3)
      .map((s) => s.label)
      .join('; ');
    lines.push(
      `Lower booking demand (not live stock): ${sample}. ` +
        `Use this to plan promotions — not inventory counts.`
    );
  }

  if (data.pendingAmount > data.advanceCollected && data.pendingAmount > 0) {
    lines.push(
      'Pending is higher than advances collected in this window — consider a polite payment-follow-up campaign from Marketing.'
    );
  }

  lines.push(data.note);

  return lines.join('\n\n');
}
