import { create } from 'zustand';
import {
  fetchMyVendor,
  vendorToSettings,
} from '@/features/vendor/api/vendorApi';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import { Vendor } from '@/types/vendor';
import { getErrorMessage } from '@/utils/errors';

interface VendorState {
  vendor: Vendor | null;
  isLoading: boolean;
  error: string | null;
  loadVendor: () => Promise<Vendor | null>;
  setVendor: (vendor: Vendor | null) => void;
  clearVendor: () => void;
  applyVendorToSettings: (vendor: Vendor) => void;
}

export const useVendorStore = create<VendorState>((set, get) => ({
  vendor: null,
  isLoading: false,
  error: null,

  setVendor: (vendor) => set({ vendor, error: null }),

  clearVendor: () => set({ vendor: null, error: null, isLoading: false }),

  applyVendorToSettings: (vendor) => {
    const mapped = vendorToSettings(vendor);
    const current = useSettingsStore.getState();
    // Keep device-local Tele-calling media (banner + murties PDF) — never
    // cleared by vendor sync (those fields are not stored on vendors).
    useSettingsStore.getState().updateSettings({
      ...mapped,
      telecallingBannerUri: current.telecallingBannerUri,
      murtiesPdfUri: current.murtiesPdfUri,
      murtiesPdfName: current.murtiesPdfName,
    });
  },

  loadVendor: async () => {
    set({ isLoading: true, error: null });
    try {
      const vendor = await fetchMyVendor();
      set({ vendor, isLoading: false });
      if (vendor) {
        get().applyVendorToSettings(vendor);
      }
      return vendor;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ vendor: null, isLoading: false, error: message });
      return null;
    }
  },
}));
