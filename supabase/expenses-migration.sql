-- Vendor business expenses for reports / profit calculation
--
-- Run order:
--   1. schema.sql
--   2. saas-migration.sql
--   3. admin-migration.sql (if using admin panel)
--   4. admin-reports-migration.sql (if using admin reports)
--   5. this file
--
-- Requires: get_my_vendor_id(), set_row_vendor_id(), update_updated_at()
-- Optional: is_super_admin() for admin read access

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_vendor_id ON expenses (vendor_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor_date ON expenses (vendor_id, expense_date);

DROP TRIGGER IF EXISTS expenses_updated_at ON expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS expenses_set_vendor ON expenses;
CREATE TRIGGER expenses_set_vendor
  BEFORE INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION set_row_vendor_id();

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendor members can read expenses" ON expenses;
DROP POLICY IF EXISTS "Vendor members can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Vendor members can update expenses" ON expenses;
DROP POLICY IF EXISTS "Vendor members can delete expenses" ON expenses;
DROP POLICY IF EXISTS "Super admins read all expenses" ON expenses;

CREATE POLICY "Vendor members can read expenses"
  ON expenses FOR SELECT TO authenticated
  USING (vendor_id = get_my_vendor_id());

CREATE POLICY "Vendor members can insert expenses"
  ON expenses FOR INSERT TO authenticated
  WITH CHECK (vendor_id = get_my_vendor_id());

CREATE POLICY "Vendor members can update expenses"
  ON expenses FOR UPDATE TO authenticated
  USING (vendor_id = get_my_vendor_id())
  WITH CHECK (vendor_id = get_my_vendor_id());

CREATE POLICY "Vendor members can delete expenses"
  ON expenses FOR DELETE TO authenticated
  USING (vendor_id = get_my_vendor_id());

-- Admin reports (safe no-op if is_super_admin is missing — run admin-migration first)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'is_super_admin' AND n.nspname = 'public'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Super admins read all expenses"
        ON expenses FOR SELECT TO authenticated
        USING (is_super_admin())
    $policy$;
  END IF;
END $$;
