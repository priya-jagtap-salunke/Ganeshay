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
  const theme = useTheme();
  if (!visible) return null;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onConfirm}
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
