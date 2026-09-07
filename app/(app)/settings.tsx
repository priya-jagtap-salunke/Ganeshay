import { ScrollView } from 'react-native';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SettingsForm } from '@/features/settings/components/SettingsForm';

export default function SettingsScreen() {
  return (
    <ScreenContainer title="Settings" compactHeader>
      <ScrollView>
        <SettingsForm />
      </ScrollView>
    </ScreenContainer>
  );
}
