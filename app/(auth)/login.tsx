import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { LoginForm } from '@/features/auth/components/LoginForm';

export default function LoginScreen() {
  return (
    <ScreenContainer showBack={false}>
      <LoginForm />
    </ScreenContainer>
  );
}
