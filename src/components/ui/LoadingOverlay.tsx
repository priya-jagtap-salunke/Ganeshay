import { StyleSheet } from 'react-native';
import { ActivityIndicator, Portal, Modal, useTheme } from 'react-native-paper';

interface LoadingOverlayProps {
  visible: boolean;
}

export function LoadingOverlay({ visible }: LoadingOverlayProps) {
  const theme = useTheme();
  if (!visible) return null;

  return (
    <Portal>
      <Modal
        visible={visible}
        dismissable={false}
        contentContainerStyle={styles.container}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 27, 31, 0.32)',
  },
});
