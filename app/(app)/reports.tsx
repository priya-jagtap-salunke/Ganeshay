import { ScrollView, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ReportsPanel } from '@/features/reports/components/ReportsPanel';

export default function ReportsScreen() {
  return (
    <ScreenContainer title="Reports">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ReportsPanel />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
});
