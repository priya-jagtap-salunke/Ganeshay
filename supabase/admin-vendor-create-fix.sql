-- Fix vendor creation: save all vendor fields via admin_create_vendor RPC
-- Run in Supabase SQL editor after admin-migration.sql

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
