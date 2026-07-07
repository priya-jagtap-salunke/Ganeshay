-- Run this in Supabase SQL editor after schema.sql

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
