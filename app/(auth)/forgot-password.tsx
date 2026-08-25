import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';

export default function ForgotPasswordScreen() {
  return (
    <ScreenContainer showBack={false}>
      <ForgotPasswordForm />
    </ScreenContainer>
  );
}
