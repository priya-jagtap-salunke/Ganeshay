import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';

export default function ResetPasswordScreen() {
  return (
    <ScreenContainer showBack={false}>
      <ResetPasswordForm />
    </ScreenContainer>
  );
}
