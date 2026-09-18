import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ImportContactsPanel } from '@/features/contact-import';

export default function ImportContactsScreen() {
  const router = useRouter();

  return (
    <ScreenContainer
      title="Import Contacts"
      onBack={() => router.replace('/(app)/dashboard')}
    >
      <ImportContactsPanel />
    </ScreenContainer>
  );
}
