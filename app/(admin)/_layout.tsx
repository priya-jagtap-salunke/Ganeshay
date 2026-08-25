import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { supabase } from '@/lib/supabase';
import { usePortalStore } from '@/stores/portalStore';
import { useVendorStore } from '@/stores/vendorStore';
import { colors } from '@/theme/colors';
import { touchTarget } from '@/theme/spacing';
import { isAdminPortalAvailable } from '@/utils/platform';

export default function AdminLayout() {
  const router = useRouter();

  useEffect(() => {
    if (!isAdminPortalAvailable()) {
      router.replace('/');
    }
  }, [router]);

  const handleLogout = async () => {
    usePortalStore.getState().clearPortal();
    await supabase.auth.signOut();
    useVendorStore.getState().clearVendor();
    router.replace('/');
  };

  if (!isAdminPortalAvailable()) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.adminPrimary },
        headerTintColor: colors.adminOnPrimary,
        headerTitleStyle: { fontWeight: '500', fontSize: 20 },
        headerShadowVisible: true,
        headerRight: () => (
          <Pressable
            onPress={handleLogout}
            style={styles.logout}
            accessibilityRole="button"
            accessibilityLabel="Logout"
            android_ripple={{ color: '#ffffff33', borderless: true }}
          >
            <Text variant="labelLarge" style={styles.logoutText}>
              Logout
            </Text>
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="vendors/index" options={{ title: 'All Vendors' }} />
      <Stack.Screen name="vendors/new" options={{ title: 'Add New Vendor' }} />
      <Stack.Screen name="vendors/[id]" options={{ title: 'Vendor Report' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  logout: {
    paddingHorizontal: 12,
    minHeight: touchTarget.min,
    justifyContent: 'center',
  },
  logoutText: {
    color: colors.adminOnPrimary,
    fontWeight: '500',
  },
});
