import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PortalIntent = 'admin' | 'vendor';

interface PortalState {
  portal: PortalIntent | null;
  setPortal: (portal: PortalIntent) => void;
  clearPortal: () => void;
}

export const usePortalStore = create<PortalState>()(
  persist(
    (set) => ({
      portal: null,
      setPortal: (portal) => set({ portal }),
      clearPortal: () => set({ portal: null }),
    }),
    {
      name: 'portal-intent',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
