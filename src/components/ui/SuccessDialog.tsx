import { StyleSheet, View, ViewStyle } from 'react-native';
import { Portal, Modal, Text } from 'react-native-paper';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppButton } from './AppButton';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

interface SuccessDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onShareWhatsApp?: () => void;
  whatsAppLoading?: boolean;
}

export function SuccessDialog({
  visible,
  title,
  message,
  onConfirm,
  onShareWhatsApp,
  whatsAppLoading,
}: SuccessDialogProps) {
  if (!visible) return null;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onConfirm}
        contentContainerStyle={[styles.modal, shadows.lg as ViewStyle]}
      >
        <Animated.View entering={ZoomIn.springify()} style={styles.content}>
          <View style={styles.iconRing}>
            <MaterialCommunityIcons
              name="check-circle"
              size={56}
              color={colors.gold}
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {onShareWhatsApp ? (
            <AppButton
              icon="whatsapp"
              variant="saffron"
              onPress={onShareWhatsApp}
              loading={whatsAppLoading}
              disabled={whatsAppLoading}
              style={styles.button}
            >
              Share on WhatsApp
            </AppButton>
          ) : null}

          <AppButton
            onPress={onConfirm}
            style={styles.button}
            variant={onShareWhatsApp ? 'outline' : 'primary'}
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
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.goldLight,
    overflow: 'hidden',
  },
  content: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.warmIvory,
    borderWidth: 3,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.royalRed,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  button: {
    alignSelf: 'stretch',
  },
});
