import { StyleSheet } from 'react-native';
import { ActivityIndicator, Portal, Modal } from 'react-native-paper';
import { colors } from '@/theme/colors';

interface LoadingOverlayProps {
  visible: boolean;
}

export function LoadingOverlay({ visible }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <Portal>
      <Modal visible={visible} contentContainerStyle={styles.container}>
        <ActivityIndicator size="large" color={colors.gold} />
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 250, 245, 0.85)',
  },
});
