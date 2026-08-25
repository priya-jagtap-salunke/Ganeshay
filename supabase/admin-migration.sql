-- Admin panel support for multi-vendor SaaS
-- Run after saas-migration.sql

CREATE TABLE IF NOT EXISTS super_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM super_admins WHERE user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS login_email TEXT;

CREATE INDEX IF NOT EXISTS idx_vendors_login_email ON vendors (lower(login_email));

-- Super admins can manage all vendors
DROP POLICY IF EXISTS "Super admins manage vendors" ON vendors;
CREATE POLICY "Super admins manage vendors"
  ON vendors FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Super admins read vendor members" ON vendor_members;
CREATE POLICY "Super admins read vendor members"
  ON vendor_members FOR SELECT TO authenticated
  USING (is_super_admin());

DROP POLICY IF EXISTS "Super admins manage vendor members" ON vendor_members;
CREATE POLICY "Super admins manage vendor members"
  ON vendor_members FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Super admins read booking sequences" ON vendor_booking_sequences;
CREATE POLICY "Super admins read booking sequences"
  ON vendor_booking_sequences FOR SELECT TO authenticated
  USING (is_super_admin());

-- Admin creates vendor profile (login user created via Edge Function or Supabase Auth)
CREATE OR REPLACE FUNCTION admin_create_vendor(
  p_business_name TEXT,
  p_phone TEXT DEFAULT '',
  p_address TEXT DEFAULT '',
  p_login_email TEXT DEFAULT '',
  p_booking_prefix TEXT DEFAULT 'ST',
  p_map_link TEXT DEFAULT '',
  p_stall_description TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id UUID;
  v_user_id UUID;
  v_email TEXT;
  v_stall_description TEXT;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_email := lower(trim(p_login_email));
  v_stall_description := NULLIF(trim(p_stall_description), '');

  INSERT INTO vendors (
    business_name,
    phone,
    address,
    login_email,
    booking_prefix,
    map_link,
    stall_description
  )
  VALUES (
    trim(p_business_name),
    trim(p_phone),
    trim(p_address),
    NULLIF(v_email, ''),
    upper(left(trim(p_booking_prefix), 4)),
    trim(p_map_link),
    COALESCE(
      v_stall_description,
      'Eco-friendly Shadu Mati Shree Ganesha Murti stall with various sizes available.'
    )
  )
  RETURNING id INTO v_vendor_id;

  INSERT INTO vendor_booking_sequences (vendor_id, last_number)
  VALUES (v_vendor_id, 0);

  IF v_email <> '' THEN
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_email LIMIT 1;
    IF v_user_id IS NOT NULL THEN
      INSERT INTO vendor_members (vendor_id, user_id, role)
      VALUES (v_vendor_id, v_user_id, 'owner')
      ON CONFLICT (user_id) DO UPDATE
      SET vendor_id = EXCLUDED.vendor_id, role = EXCLUDED.role;
    END IF;
  END IF;

  RETURN v_vendor_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_create_vendor(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION admin_link_vendor_login(
  p_vendor_id UUID,
  p_login_email TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_email := lower(trim(p_login_email));

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_email LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No login user found for %. Create the user in Supabase Auth first.', v_email;
  END IF;

  UPDATE vendors SET login_email = v_email WHERE id = p_vendor_id;

  INSERT INTO vendor_members (vendor_id, user_id, role)
  VALUES (p_vendor_id, v_user_id, 'owner')
  ON CONFLICT (user_id) DO UPDATE
  SET vendor_id = EXCLUDED.vendor_id, role = EXCLUDED.role;

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_link_vendor_login(UUID, TEXT) TO authenticated;

-- Block public self-registration of vendors (admin / Edge Function only)
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
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Vendor accounts are created by admin only';
  END IF;

  RETURN admin_create_vendor(p_business_name, p_phone, p_address, '', 'ST');
END;
$$;

-- Add your admin login user (replace email after creating auth user):
-- INSERT INTO super_admins (user_id)
-- SELECT id FROM auth.users WHERE email = 'admin@yourcompany.com'
-- ON CONFLICT DO NOTHING;
