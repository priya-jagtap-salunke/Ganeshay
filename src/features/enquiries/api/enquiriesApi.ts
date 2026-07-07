import { supabase } from '@/lib/supabase';
import {
  CreateEnquiryInput,
  Enquiry,
  EnquiryStatus,
} from '@/types/enquiry';

export async function fetchEnquiries(): Promise<Enquiry[]> {
  const { data, error } = await supabase
    .from('enquiries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createEnquiry(input: CreateEnquiryInput): Promise<Enquiry> {
  const { data, error } = await supabase
    .from('enquiries')
    .insert({
      customer_name: input.customer_name ?? null,
      mobile: input.mobile,
      source: input.source,
      call_date: input.call_date ?? null,
      notes: input.notes ?? null,
      status: 'open',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEnquiryStatus(
  id: string,
  status: EnquiryStatus
): Promise<Enquiry> {
  const { data, error } = await supabase
    .from('enquiries')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEnquiry(id: string): Promise<void> {
  const { error } = await supabase.from('enquiries').delete().eq('id', id);
  if (error) throw error;
}

export async function findEnquiryByMobile(mobile: string): Promise<Enquiry | null> {
  const digits = mobile.replace(/\D/g, '').slice(-10);
  if (!digits) return null;

  const { data, error } = await supabase
    .from('enquiries')
    .select('*')
    .ilike('mobile', `%${digits}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
