import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { AdminLoginForm } from '@/features/admin/components/AdminLoginForm';

export default function AdminLoginScreen() {
  return (
    <ScreenContainer showBack={false}>
      <AdminLoginForm />
    </ScreenContainer>
  );
}
