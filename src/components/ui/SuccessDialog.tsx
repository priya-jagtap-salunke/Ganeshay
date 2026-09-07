import { StyleSheet, View, ViewStyle } from 'react-native';
import { Portal, Modal, Text, useTheme } from 'react-native-paper';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppButton } from './AppButton';
import { elevation } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

interface SuccessDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  /** @deprecated Prefer onShareBookingDetails / onShareInvoicePdf for New Booking. */
  onShareWhatsApp?: () => void;
  whatsAppLoading?: boolean;
  onShareBookingDetails?: () => void;
  onShareInvoicePdf?: () => void;
  bookingDetailsLoading?: boolean;
  invoicePdfLoading?: boolean;
}

export function SuccessDialog({
  visible,
  title,
  message,
  onConfirm,
  onShareWhatsApp,
  whatsAppLoading,
  onShareBookingDetails,
  onShareInvoicePdf,
  bookingDetailsLoading,
  invoicePdfLoading,
}: SuccessDialogProps) {
  const theme = useTheme();
  if (!visible) return null;

  const anyShareLoading = Boolean(
    whatsAppLoading || bookingDetailsLoading || invoicePdfLoading
  );
  const hasSplitShare = Boolean(onShareBookingDetails || onShareInvoicePdf);

  return (
    <Portal>
      <Modal
        visible={visible}
        dismissable={!anyShareLoading}
        onDismiss={anyShareLoading ? undefined : onConfirm}
        contentContainerStyle={[
          styles.modal,
          elevation.level3 as ViewStyle,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Animated.View entering={ZoomIn.springify()} style={styles.content}>
          <View
            style={[
              styles.iconRing,
              { backgroundColor: theme.colors.secondaryContainer },
            ]}
          >
            <MaterialCommunityIcons
              name="check-circle"
              size={48}
              color={theme.colors.primary}
            />
          </View>
          <Text
            variant="headlineSmall"
            style={[styles.title, { color: theme.colors.onSurface }]}
          >
            {title}
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.message, { color: theme.colors.onSurfaceVariant }]}
          >
            {message}
          </Text>

          {hasSplitShare ? (
            <>
              {onShareBookingDetails ? (
                <AppButton
                  icon="whatsapp"
                  variant="saffron"
                  onPress={onShareBookingDetails}
                  loading={bookingDetailsLoading}
                  disabled={anyShareLoading}
                  style={styles.button}
                >
                  {bookingDetailsLoading
                    ? 'Preparing...'
                    : 'Share booking details on WhatsApp'}
                </AppButton>
              ) : null}
              {onShareInvoicePdf ? (
                <AppButton
                  icon="file-pdf-box"
                  variant="primary"
                  onPress={onShareInvoicePdf}
                  loading={invoicePdfLoading}
                  disabled={anyShareLoading}
                  style={styles.button}
                >
                  {invoicePdfLoading
                    ? 'Preparing PDF...'
                    : 'Share invoice PDF on WhatsApp'}
                </AppButton>
              ) : null}
            </>
          ) : onShareWhatsApp ? (
            <AppButton
              icon="whatsapp"
              variant="saffron"
              onPress={onShareWhatsApp}
              loading={whatsAppLoading}
              disabled={whatsAppLoading}
              style={styles.button}
            >
              {whatsAppLoading ? 'Preparing...' : 'Share on WhatsApp'}
            </AppButton>
          ) : null}

          <AppButton
            onPress={onConfirm}
            style={styles.button}
            variant={hasSplitShare || onShareWhatsApp ? 'outline' : 'primary'}
            disabled={anyShareLoading}
          >
            OK
          </AppButton>
        </Animated.View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  content: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    alignSelf: 'stretch',
  },
});
