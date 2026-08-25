-- AI Hub (Free) — vendor flag, optional chat tables, Sales Analyst RPC
--
-- Free mode needs:
--   - vendors.ai_enabled
--   - ai_get_sales_analysis() RPC
-- Optional / unused by free hub (safe to keep):
--   - ai_conversations / ai_messages (legacy LLM chat)
--
-- OpenAI / Edge Function is NOT required for free Marketing + Sales Analyst.
--
-- Run order:
--   1. schema.sql
--   2. saas-migration.sql
--   3. admin-migration.sql (optional)
--   4. expenses-migration.sql (optional)
--   5. this file
--
-- Requires: get_my_vendor_id(), set_row_vendor_id(), update_updated_at()

-- ---------------------------------------------------------------------------
-- Vendor flag: AI Hub enabled (default on for existing stalls)
-- ---------------------------------------------------------------------------
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN vendors.ai_enabled IS
  'When false, the floating AI Hub is hidden for this vendor.';

-- ---------------------------------------------------------------------------
-- Conversations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_vendor_updated
  ON ai_conversations (vendor_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user
  ON ai_conversations (user_id, updated_at DESC);

DROP TRIGGER IF EXISTS ai_conversations_updated_at ON ai_conversations;
CREATE TRIGGER ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS ai_conversations_set_vendor ON ai_conversations;
CREATE TRIGGER ai_conversations_set_vendor
  BEFORE INSERT ON ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION set_row_vendor_id();

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendor members can read ai_conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Vendor members can insert ai_conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Vendor members can update ai_conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Vendor members can delete ai_conversations" ON ai_conversations;

CREATE POLICY "Vendor members can read ai_conversations"
  ON ai_conversations FOR SELECT TO authenticated
  USING (vendor_id = get_my_vendor_id() AND user_id = auth.uid());

CREATE POLICY "Vendor members can insert ai_conversations"
  ON ai_conversations FOR INSERT TO authenticated
  WITH CHECK (vendor_id = get_my_vendor_id() AND user_id = auth.uid());

CREATE POLICY "Vendor members can update ai_conversations"
  ON ai_conversations FOR UPDATE TO authenticated
  USING (vendor_id = get_my_vendor_id() AND user_id = auth.uid())
  WITH CHECK (vendor_id = get_my_vendor_id() AND user_id = auth.uid());

CREATE POLICY "Vendor members can delete ai_conversations"
  ON ai_conversations FOR DELETE TO authenticated
  USING (vendor_id = get_my_vendor_id() AND user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation
  ON ai_messages (conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_ai_messages_vendor
  ON ai_messages (vendor_id, created_at DESC);

DROP TRIGGER IF EXISTS ai_messages_set_vendor ON ai_messages;
CREATE TRIGGER ai_messages_set_vendor
  BEFORE INSERT ON ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_row_vendor_id();

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendor members can read ai_messages" ON ai_messages;
DROP POLICY IF EXISTS "Vendor members can insert ai_messages" ON ai_messages;
DROP POLICY IF EXISTS "Vendor members can delete ai_messages" ON ai_messages;

CREATE POLICY "Vendor members can read ai_messages"
  ON ai_messages FOR SELECT TO authenticated
  USING (
    vendor_id = get_my_vendor_id()
    AND EXISTS (
      SELECT 1 FROM ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND c.user_id = auth.uid()
        AND c.vendor_id = get_my_vendor_id()
    )
  );

CREATE POLICY "Vendor members can insert ai_messages"
  ON ai_messages FOR INSERT TO authenticated
  WITH CHECK (
    vendor_id = get_my_vendor_id()
    AND EXISTS (
      SELECT 1 FROM ai_conversations c
      WHERE c.id = conversation_id
        AND c.user_id = auth.uid()
        AND c.vendor_id = get_my_vendor_id()
    )
  );

CREATE POLICY "Vendor members can delete ai_messages"
  ON ai_messages FOR DELETE TO authenticated
  USING (
    vendor_id = get_my_vendor_id()
    AND EXISTS (
      SELECT 1 FROM ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND c.user_id = auth.uid()
        AND c.vendor_id = get_my_vendor_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Request logs (rate limiting + audit)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_request_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'ok',
  error_message TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_request_logs_vendor_created
  ON ai_request_logs (vendor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_request_logs_user_created
  ON ai_request_logs (user_id, created_at DESC);

DROP TRIGGER IF EXISTS ai_request_logs_set_vendor ON ai_request_logs;
CREATE TRIGGER ai_request_logs_set_vendor
  BEFORE INSERT ON ai_request_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_row_vendor_id();

ALTER TABLE ai_request_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendor members can read own ai_request_logs" ON ai_request_logs;
DROP POLICY IF EXISTS "Vendor members can insert ai_request_logs" ON ai_request_logs;

-- Vendors can see their own logs; inserts typically come from the edge function
-- using the user JWT (RLS) so rate-limit checks stay tenant-scoped.
CREATE POLICY "Vendor members can read own ai_request_logs"
  ON ai_request_logs FOR SELECT TO authenticated
  USING (vendor_id = get_my_vendor_id() AND user_id = auth.uid());

CREATE POLICY "Vendor members can insert ai_request_logs"
  ON ai_request_logs FOR INSERT TO authenticated
  WITH CHECK (vendor_id = get_my_vendor_id() AND user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Scale indexes (AI hub + booking analytics at 100k+ vendors)
-- Each query is still vendor-scoped via get_my_vendor_id() / RLS.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_vendor_booking_date
  ON bookings (vendor_id, booking_date DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_vendor_murti_name
  ON bookings (vendor_id, murti_name);

CREATE INDEX IF NOT EXISTS idx_bookings_vendor_status_pending
  ON bookings (vendor_id, status)
  WHERE pending > 0;

CREATE INDEX IF NOT EXISTS idx_bookings_vendor_mobile
  ON bookings (vendor_id, mobile);

-- ---------------------------------------------------------------------------
-- Server-side sales analysis (compact JSON — no unbounded row dumps to clients)
-- SECURITY DEFINER + get_my_vendor_id(): never trusts client vendor_id.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ai_get_sales_analysis(p_days INTEGER DEFAULT 180)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_vendor_id UUID;
  v_days INTEGER;
  v_since DATE;
  v_totals RECORD;
  v_top_selling JSONB;
  v_most_profitable JSONB;
  v_repeat JSONB;
  v_slow JSONB;
  v_trend JSONB;
  v_result JSONB;
BEGIN
  v_vendor_id := get_my_vendor_id();
  IF v_vendor_id IS NULL THEN
    RAISE EXCEPTION 'No vendor account linked to this user';
  END IF;

  v_days := LEAST(GREATEST(COALESCE(p_days, 180), 30), 730);
  v_since := CURRENT_DATE - v_days;

  SELECT
    COALESCE(COUNT(*)::INTEGER, 0) AS total_bookings,
    COALESCE(SUM(price), 0)::NUMERIC AS total_revenue,
    COALESCE(SUM(advance), 0)::NUMERIC AS advance_collected,
    COALESCE(SUM(pending), 0)::NUMERIC AS pending_amount,
    COALESCE(AVG(price), 0)::NUMERIC AS avg_booking_value,
    COUNT(DISTINCT NULLIF(TRIM(mobile), ''))::INTEGER AS total_customers
  INTO v_totals
  FROM bookings
  WHERE vendor_id = v_vendor_id
    AND booking_date >= v_since;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_top_selling
  FROM (
    SELECT
      COALESCE(NULLIF(TRIM(murti_name), ''), 'Unnamed murti') AS name,
      COUNT(*)::INTEGER AS count,
      COALESCE(SUM(price), 0)::NUMERIC AS revenue
    FROM bookings
    WHERE vendor_id = v_vendor_id
      AND booking_date >= v_since
    GROUP BY 1
    ORDER BY count DESC, revenue DESC
    LIMIT 1
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_most_profitable
  FROM (
    SELECT
      COALESCE(NULLIF(TRIM(murti_name), ''), 'Unnamed murti') AS name,
      COUNT(*)::INTEGER AS count,
      COALESCE(SUM(price), 0)::NUMERIC AS revenue
    FROM bookings
    WHERE vendor_id = v_vendor_id
      AND booking_date >= v_since
    GROUP BY 1
    ORDER BY revenue DESC, count DESC
    LIMIT 1
  ) t;

  SELECT COALESCE(jsonb_build_object(
    'count', (
      SELECT COUNT(*)::INTEGER FROM (
        SELECT mobile
        FROM bookings
        WHERE vendor_id = v_vendor_id
          AND booking_date >= v_since
          AND NULLIF(TRIM(mobile), '') IS NOT NULL
        GROUP BY mobile
        HAVING COUNT(*) >= 2
      ) r
    ),
    'totalCustomers', v_totals.total_customers,
    'top', COALESCE((
      SELECT jsonb_agg(row_to_json(x)::jsonb)
      FROM (
        SELECT
          MAX(customer_name) AS name,
          ('******' || RIGHT(REGEXP_REPLACE(mobile, '\D', '', 'g'), 4)) AS "mobileMasked",
          COUNT(*)::INTEGER AS bookings,
          COALESCE(SUM(price), 0)::NUMERIC AS spent
        FROM bookings
        WHERE vendor_id = v_vendor_id
          AND booking_date >= v_since
          AND NULLIF(TRIM(mobile), '') IS NOT NULL
        GROUP BY mobile
        HAVING COUNT(*) >= 2
        ORDER BY COUNT(*) DESC, SUM(price) DESC
        LIMIT 5
      ) x
    ), '[]'::jsonb)
  ), jsonb_build_object('count', 0, 'totalCustomers', 0, 'top', '[]'::jsonb))
  INTO v_repeat;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_slow
  FROM (
    SELECT
      (COALESCE(NULLIF(TRIM(murti_name), ''), 'Unnamed')
        || ' · '
        || COALESCE(NULLIF(TRIM(murti_size), ''), 'Unspecified size')) AS label,
      COUNT(*)::INTEGER AS count,
      MAX(booking_date)::TEXT AS "lastBooked"
    FROM bookings
    WHERE vendor_id = v_vendor_id
      AND booking_date >= v_since
    GROUP BY 1
    ORDER BY count ASC, MAX(booking_date) ASC NULLS FIRST
    LIMIT 6
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.month), '[]'::jsonb)
  INTO v_trend
  FROM (
    SELECT
      to_char(date_trunc('month', booking_date::timestamp), 'YYYY-MM') AS month,
      COALESCE(SUM(price), 0)::NUMERIC AS revenue,
      COUNT(*)::INTEGER AS bookings
    FROM bookings
    WHERE vendor_id = v_vendor_id
      AND booking_date >= v_since
    GROUP BY 1
    ORDER BY 1
  ) t;

  v_result := jsonb_build_object(
    'lookbackDays', v_days,
    'totalBookings', v_totals.total_bookings,
    'totalRevenue', v_totals.total_revenue,
    'advanceCollected', v_totals.advance_collected,
    'pendingAmount', v_totals.pending_amount,
    'avgBookingValue', v_totals.avg_booking_value,
    'topSellingIdol', COALESCE(v_top_selling -> 0, 'null'::jsonb),
    'mostProfitable', COALESCE(v_most_profitable -> 0, 'null'::jsonb),
    'repeatCustomers', v_repeat,
    'slowMoving', v_slow,
    'revenueTrend', v_trend,
    'note',
      'Insights from your bookings only (vendor-scoped). Stock means booking demand by murti/size — not live inventory. Profit uses booking revenue as proxy (no cost table).'
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION ai_get_sales_analysis(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ai_get_sales_analysis(INTEGER) TO authenticated;

COMMENT ON FUNCTION ai_get_sales_analysis(INTEGER) IS
  'AI Hub Sales Analyst: compact JSON aggregates for the authenticated vendor only.';
