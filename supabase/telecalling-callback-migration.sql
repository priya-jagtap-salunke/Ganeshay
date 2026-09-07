-- Tele-calling: add dedicated Call Back (`callback`) status
--
-- Run after telecalling-migration.sql (existing projects).
-- Safe to re-run: drops and recreates status CHECK constraints.

-- Move legacy "connected + called back note" rows into Call Back
UPDATE telecalling_contacts
SET call_status = 'callback'
WHERE call_status = 'connected'
  AND lower(coalesce(last_outcome_notes, '')) LIKE '%called back%';

UPDATE telecalling_call_logs
SET outcome = 'callback'
WHERE outcome = 'connected'
  AND lower(coalesce(notes, '')) LIKE '%called back%';

-- telecalling_contacts.call_status CHECK
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

  ALTER TABLE telecalling_contacts
    ADD CONSTRAINT telecalling_contacts_call_status_check
    CHECK (call_status IN (
      'pending',
      'connected',
      'callback',
      'no_answer',
      'disconnected',
      'busy',
      'declined',
      'call_again',
      'wrong_number',
      'other'
    ));
END $$;

-- telecalling_call_logs.outcome CHECK
DO $$
DECLARE
  constraint_name text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'telecalling_call_logs'
  ) THEN
    RETURN;
  END IF;

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

  ALTER TABLE telecalling_call_logs
    ADD CONSTRAINT telecalling_call_logs_outcome_check
    CHECK (outcome IN (
      'connected',
      'callback',
      'no_answer',
      'disconnected',
      'busy',
      'declined',
      'call_again',
      'wrong_number',
      'other'
    ));
END $$;
