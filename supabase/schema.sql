-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address TEXT,
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  murti_name TEXT NOT NULL,
  murti_size TEXT,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  advance NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (advance >= 0),
  pending NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (pending >= 0),
  payment_mode TEXT CHECK (payment_mode IN ('Cash', 'UPI', 'Card')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Delivered')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookings_updated_at ON bookings;
CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Booking number sequence
CREATE SEQUENCE IF NOT EXISTS booking_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  next_num := nextval('booking_number_seq');
  RETURN 'BP' || LPAD(next_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_bookings_booking_number ON bookings (booking_number);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_name ON bookings (customer_name);
CREATE INDEX IF NOT EXISTS idx_bookings_mobile ON bookings (mobile);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings (booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);

-- Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read bookings" ON bookings;
DROP POLICY IF EXISTS "Authenticated users can insert bookings" ON bookings;
DROP POLICY IF EXISTS "Authenticated users can update bookings" ON bookings;
DROP POLICY IF EXISTS "Authenticated users can delete bookings" ON bookings;

CREATE POLICY "Authenticated users can read bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (true);

-- RPC to get next booking number atomically
CREATE OR REPLACE FUNCTION get_next_booking_number()
RETURNS TEXT AS $$
BEGIN
  RETURN generate_booking_number();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enquiries table (see supabase/enquiries.sql for standalone migration)
CREATE TABLE IF NOT EXISTS enquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT,
  mobile TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('call_log', 'manual')),
  call_date TIMESTAMPTZ,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'contacted', 'converted', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS enquiries_updated_at ON enquiries;
CREATE TRIGGER enquiries_updated_at
  BEFORE UPDATE ON enquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_enquiries_mobile ON enquiries (mobile);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries (status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON enquiries (created_at DESC);

ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read enquiries" ON enquiries;
DROP POLICY IF EXISTS "Authenticated users can insert enquiries" ON enquiries;
DROP POLICY IF EXISTS "Authenticated users can update enquiries" ON enquiries;
DROP POLICY IF EXISTS "Authenticated users can delete enquiries" ON enquiries;

CREATE POLICY "Authenticated users can read enquiries"
  ON enquiries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert enquiries"
  ON enquiries FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update enquiries"
  ON enquiries FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete enquiries"
  ON enquiries FOR DELETE TO authenticated USING (true);
