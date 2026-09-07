-- Tele-messaging: message status on shared telecalling contacts
--
-- Run after telecalling-migration.sql (and telecalling-callback-migration.sql if used).
-- Safe to re-run.
--
-- Status model: pending | sent
-- Filters in app: Pending, Sent

ALTER TABLE telecalling_contacts
  ADD COLUMN IF NOT EXISTS message_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE telecalling_contacts
  ADD COLUMN IF NOT EXISTS last_messaged_at TIMESTAMPTZ;

ALTER TABLE telecalling_contacts
  ADD COLUMN IF NOT EXISTS last_message_notes TEXT;

ALTER TABLE telecalling_contacts
  ADD COLUMN IF NOT EXISTS last_message_kind TEXT;

-- Map any earlier draft statuses before tightening CHECK
UPDATE telecalling_contacts
SET message_status = 'sent'
WHERE message_status IN ('delivered', 'sent');

UPDATE telecalling_contacts
SET message_status = 'pending'
WHERE message_status IN (
  'follow_up',
  'not_delivered',
  'not_interested',
  'other'
);

-- message_status CHECK
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
      AND pg_get_constraintdef(c.oid) ILIKE '%message_status%'
  LOOP
    EXECUTE format(
      'ALTER TABLE telecalling_contacts DROP CONSTRAINT IF EXISTS %I',
      constraint_name
    );
  END LOOP;

  ALTER TABLE telecalling_contacts
    ADD CONSTRAINT telecalling_contacts_message_status_check
    CHECK (message_status IN ('pending', 'sent'));
END $$;

-- last_message_kind CHECK (nullable)
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
      AND pg_get_constraintdef(c.oid) ILIKE '%last_message_kind%'
  LOOP
    EXECUTE format(
      'ALTER TABLE telecalling_contacts DROP CONSTRAINT IF EXISTS %I',
      constraint_name
    );
  END LOOP;

  ALTER TABLE telecalling_contacts
    ADD CONSTRAINT telecalling_contacts_last_message_kind_check
    CHECK (
      last_message_kind IS NULL
      OR last_message_kind IN ('predraft', 'catalog')
    );
END $$;

CREATE INDEX IF NOT EXISTS idx_telecalling_contacts_vendor_message_status
  ON telecalling_contacts (vendor_id, message_status);

CREATE TABLE IF NOT EXISTS telemessaging_message_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES telecalling_contacts(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL
    CHECK (outcome IN ('pending', 'sent')),
  message_kind TEXT
    CHECK (
      message_kind IS NULL
      OR message_kind IN ('predraft', 'catalog')
    ),
  notes TEXT,
  messaged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
  constraint_name text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'telemessaging_message_logs'
  ) THEN
    RETURN;
  END IF;

  UPDATE telemessaging_message_logs
  SET outcome = 'sent'
  WHERE outcome IN ('sent', 'delivered');

  UPDATE telemessaging_message_logs
  SET outcome = 'pending'
  WHERE outcome IN (
    'follow_up',
    'not_delivered',
    'not_interested',
    'other'
  );

  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'telemessaging_message_logs'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%outcome%'
  LOOP
    EXECUTE format(
      'ALTER TABLE telemessaging_message_logs DROP CONSTRAINT IF EXISTS %I',
      constraint_name
    );
  END LOOP;

  ALTER TABLE telemessaging_message_logs
    ADD CONSTRAINT telemessaging_message_logs_outcome_check
    CHECK (outcome IN ('pending', 'sent'));
END $$;

CREATE INDEX IF NOT EXISTS idx_telemessaging_message_logs_contact
  ON telemessaging_message_logs (contact_id, messaged_at DESC);

CREATE INDEX IF NOT EXISTS idx_telemessaging_message_logs_vendor
  ON telemessaging_message_logs (vendor_id, messaged_at DESC);

DROP TRIGGER IF EXISTS telemessaging_message_logs_set_vendor
  ON telemessaging_message_logs;
CREATE TRIGGER telemessaging_message_logs_set_vendor
  BEFORE INSERT ON telemessaging_message_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_row_vendor_id();

ALTER TABLE telemessaging_message_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendor members can read telemessaging_message_logs"
  ON telemessaging_message_logs;
DROP POLICY IF EXISTS "Vendor members can insert telemessaging_message_logs"
  ON telemessaging_message_logs;
DROP POLICY IF EXISTS "Vendor members can update telemessaging_message_logs"
  ON telemessaging_message_logs;
DROP POLICY IF EXISTS "Vendor members can delete telemessaging_message_logs"
  ON telemessaging_message_logs;
DROP POLICY IF EXISTS "Super admins read all telemessaging_message_logs"
  ON telemessaging_message_logs;

CREATE POLICY "Vendor members can read telemessaging_message_logs"
  ON telemessaging_message_logs FOR SELECT TO authenticated
  USING (vendor_id = get_my_vendor_id());

CREATE POLICY "Vendor members can insert telemessaging_message_logs"
  ON telemessaging_message_logs FOR INSERT TO authenticated
  WITH CHECK (vendor_id = get_my_vendor_id());

CREATE POLICY "Vendor members can update telemessaging_message_logs"
  ON telemessaging_message_logs FOR UPDATE TO authenticated
  USING (vendor_id = get_my_vendor_id())
  WITH CHECK (vendor_id = get_my_vendor_id());

CREATE POLICY "Vendor members can delete telemessaging_message_logs"
  ON telemessaging_message_logs FOR DELETE TO authenticated
  USING (vendor_id = get_my_vendor_id());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'is_super_admin' AND n.nspname = 'public'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Super admins read all telemessaging_message_logs"
        ON telemessaging_message_logs FOR SELECT TO authenticated
        USING (is_super_admin())
    $policy$;
  END IF;
END $$;
