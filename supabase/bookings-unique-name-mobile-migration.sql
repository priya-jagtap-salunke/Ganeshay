-- Duplicate bookings: block only when BOTH customer_name and mobile match
-- for the same vendor. Same mobile with a different name is allowed.
--
-- Run in Supabase SQL Editor after reviewing existing data.
-- If CREATE UNIQUE INDEX fails, resolve duplicate (vendor, name, mobile)
-- pairs first — do not delete bookings blindly.

DROP INDEX IF EXISTS idx_bookings_vendor_mobile;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_vendor_name_mobile
  ON bookings (
    vendor_id,
    lower(btrim(customer_name)),
    mobile
  )
  WHERE vendor_id IS NOT NULL
    AND mobile IS NOT NULL
    AND btrim(mobile) <> ''
    AND customer_name IS NOT NULL
    AND btrim(customer_name) <> '';
