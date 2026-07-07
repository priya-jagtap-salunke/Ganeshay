export type EnquirySource = 'call_log' | 'manual';
export type EnquiryStatus = 'open' | 'contacted' | 'converted' | 'closed';

export interface Enquiry {
  id: string;
  customer_name: string | null;
  mobile: string;
  source: EnquirySource;
  call_date: string | null;
  notes: string | null;
  status: EnquiryStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateEnquiryInput {
  customer_name?: string | null;
  mobile: string;
  source: EnquirySource;
  call_date?: string | null;
  notes?: string | null;
}
