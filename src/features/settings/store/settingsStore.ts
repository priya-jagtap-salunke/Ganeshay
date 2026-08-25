import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BusinessDocumentSettings, BusinessSettings } from '@/types/settings';
import { DEFAULT_ENQUIRY_MESSAGE } from '@/features/telecalling/utils/stallDetailsWhatsAppMessage';

interface SettingsState extends BusinessSettings {
  updateSettings: (settings: Partial<BusinessSettings>) => void;
  clearLogo: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      businessName: 'My Ganapati Stall',
      phone: '',
      address: '',
      mapLink: '',
      stallDescription:
        'Eco-friendly Shadu Mati Shree Ganesha Murti stall with various sizes available.',
      enquiryMessage: DEFAULT_ENQUIRY_MESSAGE,
      murtiesPdfUri: null,
      murtiesPdfName: null,
      businessLogo: null,
      aiEnabled: true,
      updateSettings: (settings) => set((state) => ({ ...state, ...settings })),
      clearLogo: () => set({ businessLogo: null }),
    }),
    {
      name: 'stall-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export function selectBusinessDocumentSettings(
  state: SettingsState
): BusinessDocumentSettings {
  return {
    businessName: state.businessName,
    phone: state.phone,
    address: state.address,
    businessLogo: state.businessLogo,
  };
}

export function useBusinessDocumentSettings(): BusinessDocumentSettings {
  return useSettingsStore(useShallow(selectBusinessDocumentSettings));
}
