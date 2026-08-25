import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  Platform,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { elevation } from '@/theme/shadows';
import { radius, spacing, touchTarget } from '@/theme/spacing';

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

function ActionTile({
  icon,
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: ActionTileProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading || !onPress;

  const palette: Record<
    ActionVariant,
    { backgroundColor: string; foregroundColor: string; borderColor?: string }
  > = {
    primary: {
      backgroundColor: theme.colors.primary,
      foregroundColor: theme.colors.onPrimary,
    },
    secondary: {
      backgroundColor: theme.colors.secondaryContainer,
      foregroundColor: theme.colors.onSecondaryContainer,
    },
    saffron: {
      backgroundColor: theme.colors.tertiary,
      foregroundColor: theme.colors.onTertiary,
    },
    outline: {
      backgroundColor: theme.colors.surface,
      foregroundColor: theme.colors.primary,
      borderColor: theme.colors.outline,
    },
    success: {
      backgroundColor: colors.success,
      foregroundColor: colors.white,
    },
    danger: {
      backgroundColor: theme.colors.errorContainer,
      foregroundColor: theme.colors.error,
      borderColor: theme.colors.error,
    },
  };

  const colorsForVariant = palette[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={{ color: colorsForVariant.foregroundColor + '22' }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: colorsForVariant.backgroundColor,
          borderColor: colorsForVariant.borderColor ?? colorsForVariant.backgroundColor,
          borderRadius: radius.md,
        },
        isDisabled && styles.tileDisabled,
        pressed && !isDisabled && Platform.OS !== 'android' && styles.tilePressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colorsForVariant.foregroundColor} />
      ) : (
        <MaterialCommunityIcons
          name={icon}
          size={22}
          color={colorsForVariant.foregroundColor}
        />
      )}
      <Text
        variant="labelSmall"
        style={[styles.tileLabel, { color: colorsForVariant.foregroundColor }]}
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
  const theme = useTheme();
  const actionsDisabled = isBusy || markDeliveredLoading;

  return (
    <View
      style={[
        styles.container,
        elevation.level1 as ViewStyle,
        {
          backgroundColor: theme.colors.elevation?.level1 ?? theme.colors.surface,
          borderRadius: radius.lg,
        },
      ]}
    >
      <Text
        variant="titleMedium"
        style={{ color: theme.colors.onSurface, marginBottom: spacing.sm }}
      >
        Booking Actions
      </Text>

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
    padding: spacing.md,
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tile: {
    flex: 1,
    minHeight: touchTarget.comfortable + 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  tilePressed: {
    opacity: 0.88,
  },
  tileDisabled: {
    opacity: 0.45,
  },
  tileLabel: {
    textAlign: 'center',
    fontWeight: '600',
  },
});
