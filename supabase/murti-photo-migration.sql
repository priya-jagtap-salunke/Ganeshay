-- Optional murti photo captured at booking time (local file URI or data URI).
-- Used when sharing the customer invoice on WhatsApp.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS murti_photo_uri TEXT;
