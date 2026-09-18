import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import {
  ContactImportPreviewRow,
  ContactImportValidationStatus,
} from '../types';
import { formatDisplayMobile } from '@/features/telecalling/utils/phoneNormalize';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

function statusColors(status: ContactImportValidationStatus): {
  bg: string;
  fg: string;
} {
  switch (status) {
    case 'valid':
      return { bg: colors.successContainer, fg: colors.success };
    case 'already_exists':
      return { bg: '#FFF3E0', fg: '#E65100' };
    default:
      return { bg: '#FFEBEE', fg: colors.error ?? '#C62828' };
  }
}

interface ImportPreviewRowProps {
  row: ContactImportPreviewRow;
}

export function ImportPreviewRow({ row }: ImportPreviewRowProps) {
  const tone = statusColors(row.validationStatus);
  const mobileDisplay =
    row.mobile != null
      ? formatDisplayMobile(row.mobile)
      : row.mobileRaw.trim() || '—';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text variant="labelSmall" style={styles.rowNumber}>
          Row {row.rowNumber}
        </Text>
        <View style={[styles.badge, { backgroundColor: tone.bg }]}>
          <Text variant="labelSmall" style={[styles.badgeText, { color: tone.fg }]}>
            {row.validationMessage}
          </Text>
        </View>
      </View>
      <Text variant="titleSmall" style={styles.name} numberOfLines={2}>
        {row.name.trim() || '—'}
      </Text>
      <Text variant="bodyMedium" style={styles.mobile}>
        {mobileDisplay}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.grayLight,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  rowNumber: {
    color: colors.textSecondary,
  },
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    flexShrink: 1,
  },
  badgeText: {
    fontWeight: '600',
  },
  name: {
    color: colors.textPrimary,
    marginBottom: 2,
  },
  mobile: {
    color: colors.textSecondary,
  },
});
