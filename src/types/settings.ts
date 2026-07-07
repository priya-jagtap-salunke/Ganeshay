export interface BusinessSettings {
  businessName: string;
  phone: string;
  address: string;
  /** Google Maps link or pinpoint URL shared in enquiry WhatsApp messages. */
  mapLink: string;
  /** Short stall description for enquiry messages. */
  stallDescription: string;
  /** Pre-drafted WhatsApp message for enquiries. Supports placeholders. */
  enquiryMessage: string;
  /** Persisted PDF catalog of Ganesha murties sent with enquiry WhatsApp messages. */
  murtiesPdfUri: string | null;
  murtiesPdfName: string | null;
  businessLogo: string | null;
}

/** Shared business info for PDF receipts, invoices, and reports. */
export interface BusinessDocumentSettings {
  businessName: string;
  phone: string;
  address: string;
  businessLogo: string | null;
}
