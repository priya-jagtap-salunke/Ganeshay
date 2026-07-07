import { StyleSheet, View, ViewStyle, Pressable } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Enquiry } from '@/types/enquiry';
import { AppButton } from '@/components/ui/AppButton';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

interface EnquiryCardProps {
  enquiry: Enquiry;
  index?: number;
  onSendDetails: () => void;
  onDelete: () => void;
  sending?: boolean;
}

const STATUS_COLORS: Record<Enquiry['status'], string> = {
  open: colors.deepSaffron,
  contacted: colors.goldDark,
  converted: colors.success,
  closed: colors.gray,
};

function formatWhen(dateValue: string | null): string {
  if (!dateValue) return '—';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EnquiryCard({
  enquiry,
  index = 0,
  onSendDetails,
  onDelete,
  sending,
}: EnquiryCardProps) {
  const statusColor = STATUS_COLORS[enquiry.status];

  return (
    <Animated.View entering={FadeInRight.delay(index * 60).springify()}>
      <View style={[styles.card, shadows.md as ViewStyle]}>
        <View style={styles.topRow}>
          <View style={styles.phoneBadge}>
            <MaterialCommunityIcons name="phone" size={16} color={colors.royalRed} />
            <Text style={styles.mobile}>{enquiry.mobile}</Text>
          </View>
          <Chip
            style={[styles.chip, { backgroundColor: statusColor }]}
            textStyle={styles.chipText}
          >
            {enquiry.status}
          </Chip>
        </View>

        <Text style={styles.name}>
          {enquiry.customer_name?.trim() || 'Unknown Caller'}
        </Text>
        <Text style={styles.meta}>
          {enquiry.source === 'call_log' ? 'From call log' : 'Manual entry'}
          {' • '}
          {formatWhen(enquiry.call_date ?? enquiry.created_at)}
        </Text>

        <View style={styles.actions}>
          <AppButton
            icon="whatsapp"
            variant="saffron"
            onPress={onSendDetails}
            loading={sending}
            style={styles.sendButton}
            contentStyle={styles.sendContent}
            labelStyle={styles.sendLabel}
          >
            Send Details
          </AppButton>
          <Pressable onPress={onDelete} style={styles.deleteBtn}>
            <MaterialCommunityIcons name="delete-outline" size={22} color={colors.error} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.deepSaffron,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warmIvory,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  mobile: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.royalRed,
    letterSpacing: 0.3,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sendButton: {
    flex: 1,
    marginVertical: 0,
  },
  sendContent: {
    minHeight: 48,
    paddingVertical: 4,
  },
  sendLabel: {
    fontSize: 14,
  },
  deleteBtn: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.white,
  },
  chip: {
    height: 28,
  },
  chipText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 11,
    marginVertical: 0,
    textTransform: 'capitalize',
  },
});
