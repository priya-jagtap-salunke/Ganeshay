import { supabase } from '@/lib/supabase';
import { BusinessSettings } from '@/types/settings';
import {
  RegisterVendorInput,
  SetupVendorInput,
  Vendor,
} from '@/types/vendor';
import { getErrorMessage, getSupabaseConfigError } from '@/utils/errors';
import { DEFAULT_ENQUIRY_MESSAGE } from '@/features/telecalling/utils/stallDetailsWhatsAppMessage';

function mapVendorError(error: unknown): Error {
  return new Error(getErrorMessage(error));
}

export function vendorToSettings(vendor: Vendor): BusinessSettings {
  return {
    businessName: vendor.business_name,
    phone: vendor.phone,
    address: vendor.address,
    mapLink: vendor.map_link ?? '',
    stallDescription: vendor.stall_description ?? '',
    enquiryMessage: vendor.enquiry_message ?? DEFAULT_ENQUIRY_MESSAGE,
    // Local-only media — never overwrite from vendor row (always null here).
    telecallingBannerUri: null,
    murtiesPdfUri: null,
    murtiesPdfName: null,
    businessLogo: vendor.business_logo,
    aiEnabled: vendor.ai_enabled !== false,
  };
}

export async function fetchMyVendor(): Promise<Vendor | null> {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const { data: membership, error: memberError } = await supabase
    .from('vendor_members')
    .select('vendor_id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (memberError) throw mapVendorError(memberError);
  if (!membership?.vendor_id) return null;

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', membership.vendor_id)
    .single();

  if (error) throw mapVendorError(error);
  return data as Vendor;
}

export async function registerVendorAccount(
  input: RegisterVendorInput
): Promise<Vendor> {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
  });

  if (signUpError) throw mapVendorError(signUpError);

  if (!signUpData.session) {
    throw new Error(
      'Account created. Confirm your email, then sign in to finish stall setup.'
    );
  }

  const { error: registerError } = await supabase.rpc(
    'register_vendor',
    {
      p_business_name: input.businessName.trim(),
      p_phone: input.phone.trim(),
      p_address: input.address.trim(),
    }
  );

  if (registerError) throw mapVendorError(registerError);

  const vendor = await fetchMyVendor();
  if (!vendor) {
    throw new Error('Stall account was created but could not be loaded.');
  }

  return vendor;
}

export async function setupVendorForCurrentUser(
  input: SetupVendorInput
): Promise<Vendor> {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You are not logged in.');
  }

  const { error } = await supabase.rpc('register_vendor', {
    p_business_name: input.businessName.trim(),
    p_phone: input.phone.trim(),
    p_address: input.address.trim(),
  });

  if (error) throw mapVendorError(error);

  const vendor = await fetchMyVendor();
  if (!vendor) {
    throw new Error('Stall setup completed but vendor profile could not be loaded.');
  }

  return vendor;
}

export async function updateVendorSettings(
  settings: BusinessSettings
): Promise<Vendor> {
  const vendor = await fetchMyVendor();
  if (!vendor) {
    throw new Error('No stall account found for this login.');
  }

  const { data, error } = await supabase
    .from('vendors')
    .update({
      business_name: settings.businessName.trim(),
      phone: settings.phone.trim(),
      address: settings.address.trim(),
      map_link: settings.mapLink?.trim() ?? '',
      stall_description: settings.stallDescription?.trim() ?? '',
      enquiry_message: settings.enquiryMessage?.trim() || null,
      business_logo: settings.businessLogo,
      ...(typeof settings.aiEnabled === 'boolean'
        ? { ai_enabled: settings.aiEnabled }
        : {}),
    })
    .eq('id', vendor.id)
    .select('*')
    .single();

  if (error) throw mapVendorError(error);
  return data as Vendor;
}
