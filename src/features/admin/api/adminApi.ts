import { supabase } from '@/lib/supabase';
import { Booking } from '@/types/booking';
import { Expense } from '@/types/expense';
import { Vendor } from '@/types/vendor';
import { getErrorMessage, getSupabaseConfigError } from '@/utils/errors';
import {
  buildCustomerListFromBookings,
  buildYearlySummary,
  YearlySummary,
  CustomerRecord,
} from '@/features/reports/api/reportsApi';
import { filterExpensesByYear } from '@/features/reports/api/expensesApi';

export interface AdminVendorListItem extends Vendor {
  linked: boolean;
}

export interface CreateVendorAccountInput {
  loginEmail: string;
  password: string;
  businessName: string;
  phone: string;
  address: string;
  mapLink: string;
  stallDescription: string;
  bookingPrefix: string;
}

export interface PlatformOverview {
  vendorCount: number;
  linkedVendorCount: number;
}

export interface VendorStats {
  totalBookings: number;
  pendingBookings: number;
  deliveredBookings: number;
  totalSales: number;
  advanceCollected: number;
  pendingAmount: number;
  totalEnquiries: number;
}

async function requireSuperAdmin(): Promise<void> {
  const isAdmin = await fetchIsSuperAdmin();
  if (!isAdmin) {
    throw new Error('Admin access required');
  }
}

export async function fetchIsSuperAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_super_admin');
  if (error) return false;
  return Boolean(data);
}

export async function fetchAllVendors(): Promise<AdminVendorListItem[]> {
  await requireSuperAdmin();

  const { data: vendors, error: vendorError } = await supabase
    .from('vendors')
    .select('*')
    .order('created_at', { ascending: false });

  if (vendorError) throw new Error(getErrorMessage(vendorError));

  const { data: members, error: memberError } = await supabase
    .from('vendor_members')
    .select('vendor_id');

  if (memberError) throw new Error(getErrorMessage(memberError));

  const linkedVendorIds = new Set((members ?? []).map((m) => m.vendor_id));

  return (vendors ?? []).map((vendor) => ({
    ...(vendor as Vendor),
    linked: linkedVendorIds.has(vendor.id),
  }));
}

export async function fetchVendorById(vendorId: string): Promise<Vendor> {
  await requireSuperAdmin();

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .single();

  if (error) throw new Error(getErrorMessage(error));
  return data as Vendor;
}

export async function fetchPlatformOverview(): Promise<PlatformOverview> {
  await requireSuperAdmin();

  const vendors = await fetchAllVendors();

  return {
    vendorCount: vendors.length,
    linkedVendorCount: vendors.filter((v) => v.linked).length,
  };
}

export function getVendorReportYears(onboardedAt: string): number[] {
  const startYear = new Date(onboardedAt).getFullYear();
  const endYear = new Date().getFullYear();
  const years: number[] = [];

  for (let year = startYear; year <= endYear; year += 1) {
    years.push(year);
  }

  return years.length > 0 ? years : [endYear];
}

export async function fetchVendorStats(vendorId: string): Promise<VendorStats> {
  await requireSuperAdmin();

  const { data, error } = await supabase.rpc('admin_vendor_stats', {
    p_vendor_id: vendorId,
  });

  if (error) throw new Error(getErrorMessage(error));

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      totalBookings: 0,
      pendingBookings: 0,
      deliveredBookings: 0,
      totalSales: 0,
      advanceCollected: 0,
      pendingAmount: 0,
      totalEnquiries: 0,
    };
  }

  return {
    totalBookings: Number(row.total_bookings ?? 0),
    pendingBookings: Number(row.pending_bookings ?? 0),
    deliveredBookings: Number(row.delivered_bookings ?? 0),
    totalSales: Number(row.total_sales ?? 0),
    advanceCollected: Number(row.advance_collected ?? 0),
    pendingAmount: Number(row.pending_amount ?? 0),
    totalEnquiries: Number(row.total_enquiries ?? 0),
  };
}

export async function fetchVendorYearBookings(
  vendorId: string,
  year: number
): Promise<Booking[]> {
  await requireSuperAdmin();

  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('vendor_id', vendorId)
    .gte('booking_date', start)
    .lt('booking_date', end)
    .order('booking_date', { ascending: false });

  if (error) throw new Error(getErrorMessage(error));
  return data ?? [];
}

export async function fetchVendorCustomerList(
  vendorId: string,
  year?: number
): Promise<CustomerRecord[]> {
  await requireSuperAdmin();

  if (year) {
    const bookings = await fetchVendorYearBookings(vendorId, year);
    return buildCustomerListFromBookings(bookings);
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('booking_date', { ascending: false });

  if (error) throw new Error(getErrorMessage(error));
  return buildCustomerListFromBookings(data ?? []);
}

export async function fetchVendorBookings(vendorId: string): Promise<Booking[]> {
  await requireSuperAdmin();

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('booking_date', { ascending: false });

  if (error) throw new Error(getErrorMessage(error));
  return data ?? [];
}

export async function fetchVendorExpenses(vendorId: string): Promise<Expense[]> {
  await requireSuperAdmin();

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(getErrorMessage(error));
  return (data ?? []) as Expense[];
}

export async function fetchVendorYearExpenses(
  vendorId: string,
  year: number
): Promise<Expense[]> {
  const expenses = await fetchVendorExpenses(vendorId);
  return filterExpensesByYear(expenses, year);
}

export async function fetchVendorYearlySummary(
  vendorId: string,
  year: number
): Promise<YearlySummary> {
  const [bookings, expenses] = await Promise.all([
    fetchVendorYearBookings(vendorId, year),
    fetchVendorYearExpenses(vendorId, year),
  ]);
  return buildYearlySummary(year, bookings, expenses);
}

async function createVendorProfile(
  input: CreateVendorAccountInput,
  loginEmail: string,
  bookingPrefix: string
): Promise<string> {
  const fullPayload = {
    p_business_name: input.businessName.trim(),
    p_phone: input.phone.trim(),
    p_address: input.address.trim(),
    p_login_email: loginEmail,
    p_booking_prefix: bookingPrefix,
    p_map_link: input.mapLink.trim(),
    p_stall_description: input.stallDescription.trim(),
  };

  let { data: vendorId, error: vendorError } = await supabase.rpc(
    'admin_create_vendor',
    fullPayload
  );

  if (vendorError) {
    const message = getErrorMessage(vendorError).toLowerCase();
    const missingExtendedRpc =
      message.includes('admin_create_vendor') &&
      (message.includes('does not exist') || message.includes('could not find'));

    if (missingExtendedRpc) {
      ({ data: vendorId, error: vendorError } = await supabase.rpc('admin_create_vendor', {
        p_business_name: fullPayload.p_business_name,
        p_phone: fullPayload.p_phone,
        p_address: fullPayload.p_address,
        p_login_email: fullPayload.p_login_email,
        p_booking_prefix: fullPayload.p_booking_prefix,
      }));

      if (!vendorError && vendorId) {
        const { error: updateError } = await supabase
          .from('vendors')
          .update({
            map_link: fullPayload.p_map_link,
            stall_description:
              fullPayload.p_stall_description ||
              'Eco-friendly Shadu Mati Shree Ganesha Murti stall with various sizes available.',
          })
          .eq('id', vendorId);

        if (updateError) {
          throw new Error(getErrorMessage(updateError));
        }
      }
    }
  }

  if (vendorError) {
    throw new Error(getErrorMessage(vendorError));
  }

  if (!vendorId) {
    throw new Error('Vendor profile was not created');
  }

  return String(vendorId);
}

export async function createVendorAccount(
  input: CreateVendorAccountInput
): Promise<{ vendorId: string; loginEmail: string; message: string }> {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);

  await requireSuperAdmin();

  const loginEmail = input.loginEmail.trim().toLowerCase();
  const bookingPrefix = input.bookingPrefix.trim().toUpperCase() || 'ST';

  let vendorId = await createVendorProfile(input, loginEmail, bookingPrefix);

  const { data, error } = await supabase.functions.invoke('admin-create-vendor', {
    body: {
      vendorId,
      loginEmail,
      password: input.password,
    },
  });

  if (error) {
    return {
      vendorId: String(vendorId),
      loginEmail,
      message:
        'Vendor details saved, but login was not created automatically. Create the user in Supabase Auth with the same email, then use Link Login on the vendor report page.',
    };
  }

  if (data?.error) {
    return {
      vendorId: String(vendorId),
      loginEmail,
      message: `Vendor details saved. Login error: ${String(data.error)}. Create the user in Supabase Auth and link from the vendor report page.`,
    };
  }

  const result = data as { vendorId?: string; loginEmail?: string; message?: string };

  return {
    vendorId: String(result.vendorId ?? vendorId),
    loginEmail: result.loginEmail ?? loginEmail,
    message:
      result.message ??
      'Vendor account created. Share login email and password with the stall owner.',
  };
}

export async function linkVendorLogin(
  vendorId: string,
  loginEmail: string
): Promise<void> {
  await requireSuperAdmin();

  const { error } = await supabase.rpc('admin_link_vendor_login', {
    p_vendor_id: vendorId,
    p_login_email: loginEmail.trim().toLowerCase(),
  });

  if (error) throw new Error(getErrorMessage(error));
}
