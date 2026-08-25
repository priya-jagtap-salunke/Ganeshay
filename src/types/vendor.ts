export type VendorRole = 'owner' | 'staff';

export interface Vendor {
  id: string;
  business_name: string;
  phone: string;
  address: string;
  map_link: string;
  stall_description: string;
  enquiry_message: string | null;
  business_logo: string | null;
  booking_prefix: string;
  login_email: string | null;
  /** When false, AI Assistant FAB and chat are disabled. Defaults true. */
  ai_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegisterVendorInput {
  email: string;
  password: string;
  businessName: string;
  phone: string;
  address: string;
}

export interface SetupVendorInput {
  businessName: string;
  phone: string;
  address: string;
}
