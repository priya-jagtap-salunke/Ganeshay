import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BusinessSettings } from '@/types/settings';
import { DEFAULT_ENQUIRY_MESSAGE } from '@/features/enquiries/utils/enquiryWhatsAppMessage';

interface SettingsState extends BusinessSettings {
  updateSettings: (settings: Partial<BusinessSettings>) => void;
  clearLogo: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      businessName: 'Bappaji.com',
      phone: '9595219155 / 9665543009',
      address: 'Ulkanagari, Chhatrapati Sambhajinagar',
      mapLink: '',
      stallDescription:
        'Eco-friendly Shadu Mati Shree Ganesha Murti stall with various sizes available.',
      enquiryMessage: DEFAULT_ENQUIRY_MESSAGE,
      murtiesPdfUri: null,
      murtiesPdfName: null,
      businessLogo: null,
      updateSettings: (settings) => set((state) => ({ ...state, ...settings })),
      clearLogo: () => set({ businessLogo: null }),
    }),
    {
      name: 'bappaji-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export function selectBusinessDocumentSettings(
  state: SettingsState
): BusinessSettings {
  return {
    businessName: state.businessName,
    phone: state.phone,
    address: state.address,
    businessLogo: state.businessLogo,
  };
}

export function useBusinessDocumentSettings(): BusinessSettings {
  return useSettingsStore(useShallow(selectBusinessDocumentSettings));
}
