-- Super admins can view all vendor bookings and enquiries for reports
--
-- Run order:
--   1. schema.sql
--   2. saas-migration.sql
--   3. admin-migration.sql   (full admin panel: create vendor, link login, etc.)
--   4. this file
--
-- If you see "is_super_admin() does not exist", run admin-migration.sql first.
-- The block below is a safety net only; you still need admin-migration.sql for vendor creation.

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

DROP POLICY IF EXISTS "Super admins read all bookings" ON bookings;
CREATE POLICY "Super admins read all bookings"
  ON bookings FOR SELECT TO authenticated
  USING (is_super_admin());

DROP POLICY IF EXISTS "Super admins read all enquiries" ON enquiries;
CREATE POLICY "Super admins read all enquiries"
  ON enquiries FOR SELECT TO authenticated
  USING (is_super_admin());

CREATE OR REPLACE FUNCTION admin_vendor_stats(p_vendor_id UUID)
RETURNS TABLE (
  total_bookings BIGINT,
  pending_bookings BIGINT,
  delivered_bookings BIGINT,
  total_sales NUMERIC,
  advance_collected NUMERIC,
  pending_amount NUMERIC,
  total_enquiries BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM bookings b WHERE b.vendor_id = p_vendor_id),
    (SELECT COUNT(*) FROM bookings b WHERE b.vendor_id = p_vendor_id AND b.status = 'Pending'),
    (SELECT COUNT(*) FROM bookings b WHERE b.vendor_id = p_vendor_id AND b.status = 'Delivered'),
    (SELECT COALESCE(SUM(b.price), 0) FROM bookings b WHERE b.vendor_id = p_vendor_id),
    (SELECT COALESCE(SUM(b.advance), 0) FROM bookings b WHERE b.vendor_id = p_vendor_id),
    (SELECT COALESCE(SUM(b.pending), 0) FROM bookings b WHERE b.vendor_id = p_vendor_id),
    (SELECT COUNT(*) FROM enquiries e WHERE e.vendor_id = p_vendor_id);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_vendor_stats(UUID) TO authenticated;
