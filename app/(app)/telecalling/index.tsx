import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { TelecallingPanel } from '@/features/telecalling';

export default function TelecallingScreen() {
  const router = useRouter();

  return (
    <ScreenContainer
      title="Tele-calling"
      onBack={() => router.replace('/(app)/dashboard')}
    >
      <TelecallingPanel />
    </ScreenContainer>
  );
}
