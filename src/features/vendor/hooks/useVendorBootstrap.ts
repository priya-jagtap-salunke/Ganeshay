import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useVendorStore } from '@/stores/vendorStore';

export function useVendorBootstrap() {
  const session = useAuthStore((state) => state.session);
  const loadVendor = useVendorStore((state) => state.loadVendor);
  const clearVendor = useVendorStore((state) => state.clearVendor);

  useEffect(() => {
    if (!session) {
      clearVendor();
      return;
    }

    loadVendor();
  }, [session?.user?.id, loadVendor, clearVendor, session]);
}
