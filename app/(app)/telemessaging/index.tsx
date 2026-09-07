import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { TeleMessagingPanel } from '@/features/telemessaging';

export default function TeleMessagingScreen() {
  const router = useRouter();

  return (
    <ScreenContainer
      title="Tele-Messaging"
      onBack={() => router.replace('/(app)/dashboard')}
    >
      <TeleMessagingPanel />
    </ScreenContainer>
  );
}
