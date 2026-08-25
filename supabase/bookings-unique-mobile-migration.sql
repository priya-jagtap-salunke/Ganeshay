-- Prevent duplicate bookings for the same contact (mobile) within a vendor.
-- Run in Supabase SQL Editor after reviewing existing data.
--
-- If this fails with a uniqueness violation, resolve existing duplicate
-- (vendor_id, mobile) pairs first — do not delete bookings blindly.

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_vendor_mobile
  ON bookings (vendor_id, mobile)
  WHERE vendor_id IS NOT NULL
    AND mobile IS NOT NULL
    AND btrim(mobile) <> '';
