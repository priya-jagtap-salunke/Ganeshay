-- Multi-tenant SaaS migration for Ganapati stall vendors
-- Run in Supabase SQL editor AFTER schema.sql (or on an existing project)

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  map_link TEXT NOT NULL DEFAULT '',
  stall_description TEXT NOT NULL DEFAULT 'Eco-friendly Shadu Mati Shree Ganesha Murti stall with various sizes available.',
  enquiry_message TEXT,
  business_logo TEXT,
  booking_prefix TEXT NOT NULL DEFAULT 'ST',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS vendor_booking_sequences (
  vendor_id UUID PRIMARY KEY REFERENCES vendors(id) ON DELETE CASCADE,
  last_number INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_vendor_number
  ON bookings (vendor_id, booking_number);

CREATE INDEX IF NOT EXISTS idx_bookings_vendor_id ON bookings (vendor_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_vendor_id ON enquiries (vendor_id);

DROP TRIGGER IF EXISTS vendors_updated_at ON vendors;
CREATE TRIGGER vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION get_my_vendor_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT vendor_id
  FROM vendor_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION set_row_vendor_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.vendor_id IS NULL THEN
    NEW.vendor_id := get_my_vendor_id();
  END IF;

  IF NEW.vendor_id IS NULL THEN
    RAISE EXCEPTION 'No vendor account linked to this user';
  END IF;

  IF NEW.vendor_id IS DISTINCT FROM get_my_vendor_id() THEN
    RAISE EXCEPTION 'Vendor mismatch for this user';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_set_vendor ON bookings;
CREATE TRIGGER bookings_set_vendor
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_row_vendor_id();

DROP TRIGGER IF EXISTS enquiries_set_vendor ON enquiries;
CREATE TRIGGER enquiries_set_vendor
  BEFORE INSERT ON enquiries
  FOR EACH ROW
  EXECUTE FUNCTION set_row_vendor_id();

CREATE OR REPLACE FUNCTION register_vendor(
  p_business_name TEXT,
  p_phone TEXT DEFAULT '',
  p_address TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM vendor_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Vendor already registered for this user';
  END IF;

  INSERT INTO vendors (business_name, phone, address)
  VALUES (TRIM(p_business_name), TRIM(p_phone), TRIM(p_address))
  RETURNING id INTO v_vendor_id;

  INSERT INTO vendor_members (vendor_id, user_id, role)
  VALUES (v_vendor_id, auth.uid(), 'owner');

  INSERT INTO vendor_booking_sequences (vendor_id, last_number)
  VALUES (v_vendor_id, 0);

  RETURN v_vendor_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_next_booking_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id UUID;
  v_prefix TEXT;
  v_next INTEGER;
BEGIN
  v_vendor_id := get_my_vendor_id();

  IF v_vendor_id IS NULL THEN
    RAISE EXCEPTION 'No vendor account linked to this user';
  END IF;

  SELECT booking_prefix INTO v_prefix FROM vendors WHERE id = v_vendor_id;

  UPDATE vendor_booking_sequences
  SET last_number = last_number + 1
  WHERE vendor_id = v_vendor_id
  RETURNING last_number INTO v_next;

  IF v_next IS NULL THEN
    INSERT INTO vendor_booking_sequences (vendor_id, last_number)
    VALUES (v_vendor_id, 1)
    RETURNING last_number INTO v_next;
  END IF;

  RETURN COALESCE(NULLIF(v_prefix, ''), 'ST') || LPAD(v_next::TEXT, 6, '0');
END;
$$;

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_booking_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read own vendor" ON vendors;
DROP POLICY IF EXISTS "Members can update own vendor" ON vendors;
DROP POLICY IF EXISTS "Members can read own membership" ON vendor_members;
DROP POLICY IF EXISTS "Members can read own booking sequence" ON vendor_booking_sequences;

CREATE POLICY "Members can read own vendor"
  ON vendors FOR SELECT TO authenticated
  USING (id = get_my_vendor_id());

CREATE POLICY "Members can update own vendor"
  ON vendors FOR UPDATE TO authenticated
  USING (id = get_my_vendor_id())
  WITH CHECK (id = get_my_vendor_id());

CREATE POLICY "Members can read own membership"
  ON vendor_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Members can read own booking sequence"
  ON vendor_booking_sequences FOR SELECT TO authenticated
  USING (vendor_id = get_my_vendor_id());

DROP POLICY IF EXISTS "Authenticated users can read bookings" ON bookings;
DROP POLICY IF EXISTS "Authenticated users can insert bookings" ON bookings;
DROP POLICY IF EXISTS "Authenticated users can update bookings" ON bookings;
DROP POLICY IF EXISTS "Authenticated users can delete bookings" ON bookings;
DROP POLICY IF EXISTS "Vendor members can read bookings" ON bookings;
DROP POLICY IF EXISTS "Vendor members can insert bookings" ON bookings;
DROP POLICY IF EXISTS "Vendor members can update bookings" ON bookings;
DROP POLICY IF EXISTS "Vendor members can delete bookings" ON bookings;

CREATE POLICY "Vendor members can read bookings"
  ON bookings FOR SELECT TO authenticated
  USING (vendor_id = get_my_vendor_id());

CREATE POLICY "Vendor members can insert bookings"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (vendor_id = get_my_vendor_id());

CREATE POLICY "Vendor members can update bookings"
  ON bookings FOR UPDATE TO authenticated
  USING (vendor_id = get_my_vendor_id())
  WITH CHECK (vendor_id = get_my_vendor_id());

CREATE POLICY "Vendor members can delete bookings"
  ON bookings FOR DELETE TO authenticated
  USING (vendor_id = get_my_vendor_id());

DROP POLICY IF EXISTS "Authenticated users can read enquiries" ON enquiries;
DROP POLICY IF EXISTS "Authenticated users can insert enquiries" ON enquiries;
DROP POLICY IF EXISTS "Authenticated users can update enquiries" ON enquiries;
DROP POLICY IF EXISTS "Authenticated users can delete enquiries" ON enquiries;
DROP POLICY IF EXISTS "Vendor members can read enquiries" ON enquiries;
DROP POLICY IF EXISTS "Vendor members can insert enquiries" ON enquiries;
DROP POLICY IF EXISTS "Vendor members can update enquiries" ON enquiries;
DROP POLICY IF EXISTS "Vendor members can delete enquiries" ON enquiries;

CREATE POLICY "Vendor members can read enquiries"
  ON enquiries FOR SELECT TO authenticated
  USING (vendor_id = get_my_vendor_id());

CREATE POLICY "Vendor members can insert enquiries"
  ON enquiries FOR INSERT TO authenticated
  WITH CHECK (vendor_id = get_my_vendor_id());

CREATE POLICY "Vendor members can update enquiries"
  ON enquiries FOR UPDATE TO authenticated
  USING (vendor_id = get_my_vendor_id())
  WITH CHECK (vendor_id = get_my_vendor_id());

CREATE POLICY "Vendor members can delete enquiries"
  ON enquiries FOR DELETE TO authenticated
  USING (vendor_id = get_my_vendor_id());

-- Optional: attach existing Bappaji data to the first admin user manually:
-- 1) INSERT INTO vendors (...) RETURNING id;
-- 2) INSERT INTO vendor_members (vendor_id, user_id, role) VALUES (...);
-- 3) UPDATE bookings SET vendor_id = '...' WHERE vendor_id IS NULL;
-- 4) UPDATE enquiries SET vendor_id = '...' WHERE vendor_id IS NULL;
