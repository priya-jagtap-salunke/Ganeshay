export interface BusinessSettings {
  businessName: string;
  phone: string;
  address: string;
  /** Google Maps link or pinpoint URL shared in Tele-calling WhatsApp messages. */
  mapLink: string;
  /**
   * Instagram profile URL (device-local; same pattern as Website Link).
   * Not stored on the vendors table.
   */
  instagramLink: string;
  /**
   * Business website URL (device-local; same pattern as Instagram Link).
   * Not stored on the vendors table.
   */
  websiteLink: string;
  /** Short stall description for Tele-calling messages. */
  stallDescription: string;
  /** Pre-drafted WhatsApp message for Tele-calling Send Details. Supports placeholders. */
  enquiryMessage: string;
  /** Pre-drafted WhatsApp message for Tele-Messaging Review & Request (device-local). */
  reviewRequestMessage: string;
  /**
   * Image banner attached with Tele-calling Send (message + banner).
   * Stored locally on device (not on vendors table).
   */
  telecallingBannerUri: string | null;
  /** Persisted PDF catalog of Ganesha murties sent with Tele-calling WhatsApp messages. */
  murtiesPdfUri: string | null;
  murtiesPdfName: string | null;
  businessLogo: string | null;
  /** Local preference mirror; server source of truth is vendors.ai_enabled. */
  aiEnabled?: boolean;
}

/** Shared business info for PDF receipts, invoices, and reports. */
export interface BusinessDocumentSettings {
  businessName: string;
  phone: string;
  address: string;
  businessLogo: string | null;
}
