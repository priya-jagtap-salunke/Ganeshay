import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { isAdminPortalAvailable } from '@/utils/platform';

export default function AdminAuthLayout() {
  const router = useRouter();

  useEffect(() => {
    if (!isAdminPortalAvailable()) {
      router.replace('/');
    }
  }, [router]);

  if (!isAdminPortalAvailable()) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
