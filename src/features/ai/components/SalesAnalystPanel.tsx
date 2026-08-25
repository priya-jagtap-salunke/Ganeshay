import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StatCard } from '@/components/ui/StatCard';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSalesAnalyst } from '../hooks/useSalesAnalyst';
import { formatInr } from '../api/salesAnalystApi';
import { buildSalesNarrative } from '../services/salesNarrative';
import { SalesAnalystInsight, SalesFocusId } from '../types';
import { colors, gradients } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

const FOCUS_CHIPS: Array<{ id: SalesFocusId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'top_idol', label: 'Top murti' },
  { id: 'payments', label: 'Payments' },
  { id: 'trend', label: 'Trend' },
  { id: 'repeat', label: 'Repeats' },
  { id: 'slow', label: 'Slow movers' },
];

interface SalesAnalystCardsProps {
  /** Deep-link focus from hub home sample questions */
  initialFocus?: SalesFocusId;
}

function focusNarrative(
  data: SalesAnalystInsight,
  focus: SalesFocusId
): string {
  const full = buildSalesNarrative(data);
  if (focus === 'overview') return full;

  if (focus === 'top_idol') {
    if (!data.topSellingIdol) {
      return 'No murti bookings in this period yet — top-selling idol will appear once you add bookings.';
    }
    return (
      `Your top-selling murti is ${data.topSellingIdol.name} ` +
      `(${data.topSellingIdol.count} bookings, ${formatInr(data.topSellingIdol.revenue)}).` +
      (data.mostProfitable &&
      data.mostProfitable.name !== data.topSellingIdol.name
        ? `\n\nHighest revenue murti: ${data.mostProfitable.name} (${formatInr(data.mostProfitable.revenue)}).`
        : '') +
      `\n\n${data.note}`
    );
  }

  if (focus === 'payments') {
    return (
      `Payment snapshot (last ${data.lookbackDays} days):\n` +
      `• Total revenue: ${formatInr(data.totalRevenue)}\n` +
      `• Advance collected: ${formatInr(data.advanceCollected)}\n` +
      `• Pending: ${formatInr(data.pendingAmount)}\n` +
      `• Average booking: ${formatInr(data.avgBookingValue)}\n\n` +
      (data.pendingAmount > data.advanceCollected && data.pendingAmount > 0
        ? 'Pending is higher than advances in this window — consider a polite reminder from Marketing.\n\n'
        : '') +
      data.note
    );
  }

  if (focus === 'trend') {
    if (data.revenueTrend.length === 0) {
      return 'Not enough booking history for a revenue trend yet.';
    }
    const lines = data.revenueTrend
      .slice(-6)
      .map(
        (m) =>
          `• ${m.month}: ${formatInr(m.revenue)} (${m.bookings} bookings)`
      )
      .join('\n');
    return `Revenue by month:\n${lines}\n\n${data.note}`;
  }

  if (focus === 'repeat') {
    const r = data.repeatCustomers;
    if (r.totalCustomers === 0) {
      return 'No customers in this window yet.';
    }
    const top =
      r.top.length === 0
        ? 'No repeat customers yet.'
        : r.top
            .map(
              (c) =>
                `• ${c.name} (${c.mobileMasked}): ${c.bookings}× · ${formatInr(c.spent)}`
            )
            .join('\n');
    return (
      `Repeat customers: ${r.count} of ${r.totalCustomers}.\n\n${top}\n\n${data.note}`
    );
  }

  if (focus === 'slow') {
    if (data.slowMoving.length === 0) {
      return 'No slow-moving size/type patterns yet.';
    }
    const list = data.slowMoving
      .map((s) => `• ${s.label} — ${s.count} booked`)
      .join('\n');
    return (
      `Lower booking demand (not live stock):\n${list}\n\nUse this to plan promotions — not inventory counts.\n\n${data.note}`
    );
  }

  return full;
}

function SalesDashboardBody({
  data,
  isFetching,
  focus,
  onFocusChange,
}: {
  data: SalesAnalystInsight;
  isFetching: boolean;
  focus: SalesFocusId;
  onFocusChange: (id: SalesFocusId) => void;
}) {
  const theme = useTheme();
  const topIdol = data.topSellingIdol?.name ?? '—';
  const profitable = data.mostProfitable?.name ?? '—';
  const lastMonths = data.revenueTrend.slice(-4);
  const maxRev = Math.max(...lastMonths.map((m) => m.revenue), 1);
  const narrative = useMemo(
    () => focusNarrative(data, focus),
    [data, focus]
  );

  const highlight = (id: SalesFocusId) => focus === id;

  return (
    <View style={styles.content}>
      <View style={styles.focusRow}>
        {FOCUS_CHIPS.map((chip) => {
          const selected = focus === chip.id;
          return (
            <Pressable
              key={chip.id}
              onPress={() => onFocusChange(chip.id)}
              style={[
                styles.focusChip,
                {
                  backgroundColor: selected
                    ? theme.colors.secondaryContainer
                    : theme.colors.surfaceVariant,
                  borderColor: selected
                    ? theme.colors.secondary
                    : 'transparent',
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: selected
                    ? theme.colors.onSecondaryContainer
                    : theme.colors.onSurfaceVariant,
                }}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Animated.View entering={FadeInDown.springify()}>
        <LinearGradient
          colors={[...gradients.hero]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.hero,
            highlight('payments') ? styles.focusedRing : null,
          ]}
        >
          <Text style={styles.heroKicker}>Sales Analyst · free</Text>
          <Text style={styles.heroTitle}>Your stall pulse</Text>
          <Text style={styles.heroMeta}>
            Last {data.lookbackDays} days · {data.totalBookings} bookings
            {isFetching ? ' · refreshing…' : ''}
          </Text>
          <Text style={styles.heroRevenue}>{formatInr(data.totalRevenue)}</Text>
          <Text style={styles.heroRevenueLabel}>Total revenue</Text>
        </LinearGradient>
      </Animated.View>

      <View style={styles.statsRow}>
        <StatCard
          compact
          index={0}
          title="Avg booking"
          value={formatInr(data.avgBookingValue)}
          icon="cash"
          accentColor={colors.royalRed}
        />
        <StatCard
          compact
          index={1}
          title="Advance in"
          value={formatInr(data.advanceCollected)}
          icon="cash-check"
          accentColor={colors.success}
        />
        <StatCard
          compact
          index={2}
          title="Pending"
          value={formatInr(data.pendingAmount)}
          icon="clock-outline"
          accentColor={colors.pending}
        />
      </View>

      <AppCard
        elevationLevel={2}
        style={[
          styles.insightCard,
          highlight('overview') ? styles.focusedBorder : null,
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          Quick insight
        </Text>
        <Text
          selectable
          style={[styles.narrative, { color: theme.colors.onSurface }]}
        >
          {narrative}
        </Text>
        <Text style={[styles.footnote, { color: theme.colors.onSurfaceVariant }]}>
          Written from your booking numbers — not ChatGPT.
        </Text>
      </AppCard>

      <AppCard
        elevationLevel={2}
        style={[
          styles.insightCard,
          highlight('top_idol') ? styles.focusedBorder : null,
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          Top-selling idol
        </Text>
        <Text style={[styles.bigValue, { color: theme.colors.onSurface }]}>
          {topIdol}
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          {data.topSellingIdol
            ? `${data.topSellingIdol.count} bookings · ${formatInr(data.topSellingIdol.revenue)}`
            : 'No murti bookings in this period.'}
        </Text>
      </AppCard>

      <AppCard elevationLevel={2} style={styles.insightCard}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          Most profitable (by revenue)
        </Text>
        <Text style={[styles.bigValue, { color: theme.colors.onSurface }]}>
          {profitable}
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          {data.mostProfitable
            ? `${formatInr(data.mostProfitable.revenue)} across ${data.mostProfitable.count} bookings`
            : 'No data yet.'}
        </Text>
        <Text style={[styles.footnote, { color: theme.colors.onSurfaceVariant }]}>
          Revenue proxy — no product cost table in the app.
        </Text>
      </AppCard>

      <AppCard
        elevationLevel={2}
        style={[
          styles.insightCard,
          highlight('trend') ? styles.focusedBorder : null,
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          Revenue trend
        </Text>
        {lastMonths.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Not enough booking history for a trend.
          </Text>
        ) : (
          <View style={styles.bars}>
            {lastMonths.map((m) => (
              <View key={m.month} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: Math.max(
                          8,
                          Math.round((m.revenue / maxRev) * 88)
                        ),
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.barLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {m.month.slice(5)}
                </Text>
                <Text
                  style={[styles.barValue, { color: theme.colors.onSurface }]}
                  numberOfLines={1}
                >
                  {formatInr(m.revenue)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </AppCard>

      <AppCard
        elevationLevel={2}
        style={[
          styles.insightCard,
          highlight('repeat') ? styles.focusedBorder : null,
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          Repeat customers
        </Text>
        <Text style={[styles.bigValue, { color: theme.colors.onSurface }]}>
          {data.repeatCustomers.count}
          <Text style={{ fontSize: 16, fontWeight: '400' }}>
            {' '}
            / {data.repeatCustomers.totalCustomers}
          </Text>
        </Text>
        {data.repeatCustomers.top.map((c) => (
          <View key={`${c.mobileMasked}-${c.name}`} style={styles.listRow}>
            <Text style={{ color: theme.colors.onSurface, flex: 1 }}>
              {c.name}{' '}
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                ({c.mobileMasked})
              </Text>
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {c.bookings}× · {formatInr(c.spent)}
            </Text>
          </View>
        ))}
        {data.repeatCustomers.top.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            No repeat customers in this window yet.
          </Text>
        ) : null}
      </AppCard>

      <AppCard
        elevationLevel={2}
        style={[
          styles.insightCard,
          highlight('slow') ? styles.focusedBorder : null,
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          Slow-moving (booking demand)
        </Text>
        {data.slowMoving.map((item) => (
          <View key={item.label} style={styles.listRow}>
            <Text
              style={{ color: theme.colors.onSurface, flex: 1 }}
              numberOfLines={2}
            >
              {item.label}
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {item.count} booked
            </Text>
          </View>
        ))}
        <Text style={[styles.footnote, { color: theme.colors.onSurfaceVariant }]}>
          {data.note}
        </Text>
      </AppCard>
    </View>
  );
}

/**
 * Sales Analyst dashboard for the free AI hub only.
 * Data from `ai_get_sales_analysis` RPC — not ReportsPanel. No LLM.
 */
export function SalesAnalystCards({
  initialFocus = 'overview',
}: SalesAnalystCardsProps) {
  const [focus, setFocus] = useState<SalesFocusId>(initialFocus);
  const { data, isLoading, isError, error, refetch, isFetching } =
    useSalesAnalyst(180);

  useEffect(() => {
    if (initialFocus) setFocus(initialFocus);
  }, [initialFocus]);

  if (isLoading) {
    return (
      <View style={styles.pad}>
        <EmptyState
          compact
          icon="chart-box-outline"
          message="Loading sales insights from your bookings…"
        />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.pad}>
        <EmptyState
          compact
          icon="chart-box-outline"
          message={
            error instanceof Error
              ? error.message
              : 'Could not load sales insights. Run supabase/ai-migration.sql if this persists.'
          }
        />
        <AppButton variant="outline" onPress={() => refetch()}>
          Retry
        </AppButton>
      </View>
    );
  }

  return (
    <SalesDashboardBody
      data={data}
      isFetching={isFetching}
      focus={focus}
      onFocusChange={setFocus}
    />
  );
}

/** @deprecated use SalesAnalystCards — kept name for older imports */
export const SalesAnalystPanel = SalesAnalystCards;

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  pad: { padding: spacing.md, gap: spacing.md },
  focusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  focusChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  hero: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  focusedRing: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  focusedBorder: {
    borderWidth: 1.5,
    borderColor: colors.goldDark,
  },
  heroKicker: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    marginTop: 4,
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontSize: 13,
  },
  heroRevenue: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  heroRevenueLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  insightCard: {
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  narrative: {
    fontSize: 14,
    lineHeight: 21,
  },
  bigValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  footnote: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: spacing.sm,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    height: 140,
    marginTop: spacing.sm,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '70%',
    height: 88,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
  },
  barLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  barValue: {
    fontSize: 10,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
  },
});
