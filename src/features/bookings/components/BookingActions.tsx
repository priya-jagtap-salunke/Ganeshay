import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

interface BookingActionsProps {
  onViewReceipt: () => void;
  onDownloadPdf: () => void;
  onShareWhatsApp: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMarkDelivered?: () => void;
  showMarkDelivered?: boolean;
  isBusy?: boolean;
  activeAction?: string | null;
  markDeliveredLoading?: boolean;
}

type ActionVariant = 'primary' | 'secondary' | 'saffron' | 'outline' | 'success' | 'danger';

interface ActionTileProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress?: () => void;
  variant?: ActionVariant;
  loading?: boolean;
  disabled?: boolean;
}

const variantStyles: Record<
  ActionVariant,
  { backgroundColor: string; foregroundColor: string; borderColor?: string }
> = {
  primary: {
    backgroundColor: colors.royalRed,
    foregroundColor: colors.white,
  },
  secondary: {
    backgroundColor: colors.gold,
    foregroundColor: colors.textPrimary,
  },
  saffron: {
    backgroundColor: colors.deepSaffron,
    foregroundColor: colors.white,
  },
  outline: {
    backgroundColor: colors.white,
    foregroundColor: colors.royalRed,
    borderColor: colors.gold,
  },
  success: {
    backgroundColor: colors.success,
    foregroundColor: colors.white,
  },
  danger: {
    backgroundColor: colors.white,
    foregroundColor: colors.error,
    borderColor: colors.error,
  },
};

function ActionTile({
  icon,
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: ActionTileProps) {
  const palette = variantStyles[variant];
  const isDisabled = disabled || loading || !onPress;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor ?? palette.backgroundColor,
        },
        isDisabled && styles.tileDisabled,
        pressed && !isDisabled && styles.tilePressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.foregroundColor} />
      ) : (
        <MaterialCommunityIcons
          name={icon}
          size={22}
          color={palette.foregroundColor}
        />
      )}
      <Text
        style={[styles.tileLabel, { color: palette.foregroundColor }]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function BookingActions({
  onViewReceipt,
  onDownloadPdf,
  onShareWhatsApp,
  onEdit,
  onDelete,
  onMarkDelivered,
  showMarkDelivered = false,
  isBusy,
  activeAction,
  markDeliveredLoading,
}: BookingActionsProps) {
  const actionsDisabled = isBusy || markDeliveredLoading;

  return (
    <View style={[styles.container, shadows.sm as ViewStyle]}>
      <Text style={styles.title}>Booking Actions</Text>

      <ActionRow>
        <ActionTile
          icon="file-eye"
          label="View Receipt"
          onPress={onViewReceipt}
          variant="primary"
          loading={isBusy && activeAction === 'view'}
          disabled={actionsDisabled}
        />
        <ActionTile
          icon="download"
          label="Download PDF"
          onPress={onDownloadPdf}
          variant="secondary"
          loading={isBusy && activeAction === 'download'}
          disabled={actionsDisabled}
        />
        <ActionTile
          icon="whatsapp"
          label="Share WhatsApp"
          onPress={onShareWhatsApp}
          variant="saffron"
          loading={isBusy && activeAction === 'whatsapp'}
          disabled={actionsDisabled}
        />
      </ActionRow>

      <ActionRow>
        <ActionTile
          icon="pencil"
          label="Edit Booking"
          onPress={onEdit}
          variant="outline"
          disabled={actionsDisabled}
        />
        <ActionTile
          icon="delete"
          label="Delete Booking"
          onPress={onDelete}
          variant="danger"
          disabled={actionsDisabled}
        />
        <ActionTile
          icon="check-circle"
          label={showMarkDelivered ? 'Mark Delivered' : 'Delivered'}
          onPress={showMarkDelivered ? onMarkDelivered : undefined}
          variant={showMarkDelivered ? 'success' : 'outline'}
          loading={markDeliveredLoading}
          disabled={!showMarkDelivered || actionsDisabled}
        />
      </ActionRow>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.royalRed,
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  tile: {
    flex: 1,
    minHeight: 76,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  tilePressed: {
    opacity: 0.88,
  },
  tileDisabled: {
    opacity: 0.55,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
  },
});
