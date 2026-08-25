-- Tele-calling contacts + call outcome history
--
-- Run order:
--   1. schema.sql
--   2. saas-migration.sql
--   3. this file
--
-- Requires: get_my_vendor_id(), set_row_vendor_id(), update_updated_at()
-- Optional: is_super_admin() for admin read access

-- Contact list (Excel import + phone sync)
CREATE TABLE IF NOT EXISTS telecalling_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  notes TEXT,
  call_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (call_status IN (
      'pending',
      'connected',
      'no_answer',
      'disconnected',
      'busy',
      'declined',
      'call_again',
      'wrong_number',
      'other'
    )),
  last_called_at TIMESTAMPTZ,
  last_outcome_notes TEXT,
  synced_to_device BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT telecalling_contacts_mobile_digits
    CHECK (mobile ~ '^[0-9]{10}$'),
  CONSTRAINT telecalling_contacts_vendor_mobile_unique
    UNIQUE (vendor_id, mobile)
);

CREATE INDEX IF NOT EXISTS idx_telecalling_contacts_vendor_id
  ON telecalling_contacts (vendor_id);

CREATE INDEX IF NOT EXISTS idx_telecalling_contacts_vendor_status
  ON telecalling_contacts (vendor_id, call_status);

DROP TRIGGER IF EXISTS telecalling_contacts_updated_at ON telecalling_contacts;
CREATE TRIGGER telecalling_contacts_updated_at
  BEFORE UPDATE ON telecalling_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS telecalling_contacts_set_vendor ON telecalling_contacts;
CREATE TRIGGER telecalling_contacts_set_vendor
  BEFORE INSERT ON telecalling_contacts
  FOR EACH ROW
  EXECUTE FUNCTION set_row_vendor_id();

ALTER TABLE telecalling_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendor members can read telecalling_contacts" ON telecalling_contacts;
DROP POLICY IF EXISTS "Vendor members can insert telecalling_contacts" ON telecalling_contacts;
DROP POLICY IF EXISTS "Vendor members can update telecalling_contacts" ON telecalling_contacts;
DROP POLICY IF EXISTS "Vendor members can delete telecalling_contacts" ON telecalling_contacts;
DROP POLICY IF EXISTS "Super admins read all telecalling_contacts" ON telecalling_contacts;

CREATE POLICY "Vendor members can read telecalling_contacts"
  ON telecalling_contacts FOR SELECT TO authenticated
  USING (vendor_id = get_my_vendor_id());

CREATE POLICY "Vendor members can insert telecalling_contacts"
  ON telecalling_contacts FOR INSERT TO authenticated
  WITH CHECK (vendor_id = get_my_vendor_id());

CREATE POLICY "Vendor members can update telecalling_contacts"
  ON telecalling_contacts FOR UPDATE TO authenticated
  USING (vendor_id = get_my_vendor_id())
  WITH CHECK (vendor_id = get_my_vendor_id());

CREATE POLICY "Vendor members can delete telecalling_contacts"
  ON telecalling_contacts FOR DELETE TO authenticated
  USING (vendor_id = get_my_vendor_id());

-- Per-call outcome history (one row per dial attempt)
CREATE TABLE IF NOT EXISTS telecalling_call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES telecalling_contacts(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL
    CHECK (outcome IN (
      'connected',
      'no_answer',
      'disconnected',
      'busy',
      'declined',
      'call_again',
      'wrong_number',
      'other'
    )),
  notes TEXT,
  called_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telecalling_call_logs_contact
  ON telecalling_call_logs (contact_id, called_at DESC);

CREATE INDEX IF NOT EXISTS idx_telecalling_call_logs_vendor
  ON telecalling_call_logs (vendor_id, called_at DESC);

DROP TRIGGER IF EXISTS telecalling_call_logs_set_vendor ON telecalling_call_logs;
CREATE TRIGGER telecalling_call_logs_set_vendor
  BEFORE INSERT ON telecalling_call_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_row_vendor_id();

ALTER TABLE telecalling_call_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendor members can read telecalling_call_logs" ON telecalling_call_logs;
DROP POLICY IF EXISTS "Vendor members can insert telecalling_call_logs" ON telecalling_call_logs;
DROP POLICY IF EXISTS "Vendor members can update telecalling_call_logs" ON telecalling_call_logs;
DROP POLICY IF EXISTS "Vendor members can delete telecalling_call_logs" ON telecalling_call_logs;
DROP POLICY IF EXISTS "Super admins read all telecalling_call_logs" ON telecalling_call_logs;

CREATE POLICY "Vendor members can read telecalling_call_logs"
  ON telecalling_call_logs FOR SELECT TO authenticated
  USING (vendor_id = get_my_vendor_id());

CREATE POLICY "Vendor members can insert telecalling_call_logs"
  ON telecalling_call_logs FOR INSERT TO authenticated
  WITH CHECK (vendor_id = get_my_vendor_id());

CREATE POLICY "Vendor members can update telecalling_call_logs"
  ON telecalling_call_logs FOR UPDATE TO authenticated
  USING (vendor_id = get_my_vendor_id())
  WITH CHECK (vendor_id = get_my_vendor_id());

CREATE POLICY "Vendor members can delete telecalling_call_logs"
  ON telecalling_call_logs FOR DELETE TO authenticated
  USING (vendor_id = get_my_vendor_id());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'is_super_admin' AND n.nspname = 'public'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Super admins read all telecalling_contacts"
        ON telecalling_contacts FOR SELECT TO authenticated
        USING (is_super_admin())
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Super admins read all telecalling_call_logs"
        ON telecalling_call_logs FOR SELECT TO authenticated
        USING (is_super_admin())
    $policy$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Idempotent schema upgrades (safe if an earlier draft migration already ran)
-- ---------------------------------------------------------------------------

ALTER TABLE telecalling_contacts
  ADD COLUMN IF NOT EXISTS last_called_at TIMESTAMPTZ;

ALTER TABLE telecalling_contacts
  ADD COLUMN IF NOT EXISTS last_outcome_notes TEXT;

-- Drop any prior call_status CHECK (name varies) and re-apply current statuses
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'telecalling_contacts'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%call_status%'
  LOOP
    EXECUTE format(
      'ALTER TABLE telecalling_contacts DROP CONSTRAINT IF EXISTS %I',
      constraint_name
    );
  END LOOP;
END $$;

-- Map legacy draft statuses while CHECK is dropped
UPDATE telecalling_contacts
SET call_status = 'connected'
WHERE call_status IN ('called', 'interested');

UPDATE telecalling_contacts
SET call_status = 'declined'
WHERE call_status = 'not_interested';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'telecalling_contacts_call_status_check'
  ) THEN
    ALTER TABLE telecalling_contacts
      ADD CONSTRAINT telecalling_contacts_call_status_check
      CHECK (call_status IN (
        'pending',
        'connected',
        'no_answer',
        'disconnected',
        'busy',
        'declined',
        'call_again',
        'wrong_number',
        'other'
      ));
  END IF;
END $$;

DO $$
DECLARE
  constraint_name text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'telecalling_call_logs'
  ) THEN
    FOR constraint_name IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'telecalling_call_logs'
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) ILIKE '%outcome%'
    LOOP
      EXECUTE format(
        'ALTER TABLE telecalling_call_logs DROP CONSTRAINT IF EXISTS %I',
        constraint_name
      );
    END LOOP;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'telecalling_call_logs_outcome_check'
    ) THEN
      ALTER TABLE telecalling_call_logs
        ADD CONSTRAINT telecalling_call_logs_outcome_check
        CHECK (outcome IN (
          'connected',
          'no_answer',
          'disconnected',
          'busy',
          'declined',
          'call_again',
          'wrong_number',
          'other'
        ));
    END IF;
  END IF;
END $$;
