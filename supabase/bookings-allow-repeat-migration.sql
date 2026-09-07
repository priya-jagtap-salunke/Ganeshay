-- Allow the same customer (name + mobile) to book more than once.
-- Repeat bookings show as "Name (booked again)" in the app.
--
-- Run in Supabase SQL Editor. Safe to re-run.

DROP INDEX IF EXISTS idx_bookings_vendor_mobile;
DROP INDEX IF EXISTS idx_bookings_vendor_name_mobile;
