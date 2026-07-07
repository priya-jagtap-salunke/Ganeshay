import { useState, useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Dialog, Portal, Text } from 'react-native-paper';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { Booking } from '@/types/booking';
import { formatCurrency } from '@/utils/currency';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

interface DeliveryDialogProps {
  visible: boolean;
  booking: Booking;
  onDismiss: () => void;
  onConfirm: (amount: number) => void;
  isLoading?: boolean;
}

export function DeliveryDialog({
  visible,
  booking,
  onDismiss,
  onConfirm,
  isLoading,
}: DeliveryDialogProps) {
  const [amount, setAmount] = useState(String(booking.pending));

  useEffect(() => {
    setAmount(String(booking.pending));
  }, [booking.pending, visible]);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={[styles.dialog, shadows.lg as ViewStyle]}>
        <Dialog.Title style={styles.dialogTitle}>Mark Delivered</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.label}>
            Remaining Amount: {formatCurrency(booking.pending)}
          </Text>
          <Text style={styles.question}>Remaining Amount Received?</Text>
          <AppInput
            label="Amount Received"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
        </Dialog.Content>
        <Dialog.Actions style={styles.actions}>
          <AppButton variant="outline" onPress={onDismiss}>
            Cancel
          </AppButton>
          <AppButton
            onPress={() => onConfirm(Number(amount))}
            loading={isLoading}
            variant="saffron"
          >
            Confirm
          </AppButton>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.goldLight,
    marginHorizontal: spacing.md,
  },
  dialogTitle: {
    color: colors.royalRed,
    fontWeight: '800',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  question: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'column',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});
