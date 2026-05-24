
-- ============================================================
-- #9: lat/lng validation trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_item_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Live location: address set but lat/lng missing
  IF NEW.location_address IS NOT NULL
     AND btrim(NEW.location_address) <> ''
     AND (NEW.location_lat IS NULL OR NEW.location_lng IS NULL) THEN
    -- Allow if address unchanged (legacy rows)
    IF TG_OP = 'INSERT'
       OR OLD.location_address IS DISTINCT FROM NEW.location_address THEN
      RAISE EXCEPTION 'location_address is set (%) but location_lat/lng is NULL. Geocode the address before saving.', NEW.location_address
        USING ERRCODE = 'check_violation', HINT = 'Call edge function geocode-address or set coordinates manually.';
    END IF;
  END IF;

  -- Pending location: address set but lat/lng missing
  IF NEW.pending_location_address IS NOT NULL
     AND btrim(NEW.pending_location_address) <> ''
     AND (NEW.pending_location_lat IS NULL OR NEW.pending_location_lng IS NULL) THEN
    IF TG_OP = 'INSERT'
       OR OLD.pending_location_address IS DISTINCT FROM NEW.pending_location_address THEN
      RAISE EXCEPTION 'pending_location_address is set (%) but pending_location_lat/lng is NULL. Geocode before publishing.', NEW.pending_location_address
        USING ERRCODE = 'check_violation', HINT = 'Call edge function geocode-address or set coordinates manually.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_item_location ON public.program_request_items;
CREATE TRIGGER trg_validate_item_location
  BEFORE INSERT OR UPDATE OF location_address, location_lat, location_lng,
                              pending_location_address, pending_location_lat, pending_location_lng
  ON public.program_request_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_item_location();

-- ============================================================
-- #10: stale-pending scan + cron
-- ============================================================
CREATE OR REPLACE FUNCTION public.scan_stale_pending_changes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_item record;
BEGIN
  FOR v_item IN
    SELECT i.id, i.request_id, i.block_name, i.provider_name, i.pending_changed_at
    FROM program_request_items i
    WHERE (i.pending_changed_at IS NOT NULL
           OR i.pending_marked_for_removal = true
           OR i.pending_added = true)
      AND i.pending_changed_at < now() - interval '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM admin_todos t
        WHERE t.auto_type = 'stale_pending_change'
          AND t.auto_entity_id = i.id::text
          AND t.status IN ('todo','in_progress')
      )
  LOOP
    INSERT INTO admin_todos (
      title, description, priority, status,
      related_request_id, auto_type, auto_entity_id
    ) VALUES (
      format('Openstaande wijziging > 7 dagen: %s', v_item.block_name),
      format('Item "%s" (provider %s) heeft sinds %s een ongepubliceerde wijziging.',
             v_item.block_name, v_item.provider_name,
             to_char(v_item.pending_changed_at, 'DD-MM-YYYY')),
      'normal', 'todo',
      v_item.request_id, 'stale_pending_change', v_item.id::text
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Schedule daily at 07:00 (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('scan-stale-pending-changes');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'scan-stale-pending-changes',
  '0 7 * * *',
  $$SELECT public.scan_stale_pending_changes();$$
);

-- ============================================================
-- #11: audit-log view (per request)
-- ============================================================
CREATE OR REPLACE VIEW public.program_audit_log AS
SELECT
  'change'::text AS event_kind,
  c.id          AS event_id,
  c.request_id,
  c.item_id,
  c.changed_at  AS occurred_at,
  c.field       AS subject,
  jsonb_build_object(
    'old', c.old_value,
    'new', c.new_value,
    'published_at', c.published_at,
    'notified_emails', c.notified_emails,
    'admin_note', c.admin_note,
    'changed_by', c.changed_by
  ) AS payload
FROM public.program_change_log c
UNION ALL
SELECT
  'email'::text AS event_kind,
  e.id          AS event_id,
  e.related_request_id AS request_id,
  e.related_item_id    AS item_id,
  COALESCE(e.sent_at, e.created_at) AS occurred_at,
  e.email_type  AS subject,
  jsonb_build_object(
    'subject', e.subject,
    'recipient', e.recipient_email,
    'recipient_name', e.recipient_name,
    'status', e.status,
    'mailjet_message_id', e.mailjet_message_id,
    'metadata', e.metadata
  ) AS payload
FROM public.email_log e
WHERE e.related_request_id IS NOT NULL;

GRANT SELECT ON public.program_audit_log TO authenticated;

-- ============================================================
-- #12: partner "since last seen" tracking
-- ============================================================
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS last_dashboard_seen_at timestamptz;

CREATE OR REPLACE FUNCTION public.touch_partner_last_seen(p_partner_id text)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev timestamptz;
BEGIN
  SELECT last_dashboard_seen_at INTO v_prev
  FROM partners WHERE id = p_partner_id;

  UPDATE partners
     SET last_dashboard_seen_at = now()
   WHERE id = p_partner_id;

  RETURN v_prev;
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_partner_last_seen(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_partner_changes_since_last_seen(p_partner_id text)
RETURNS TABLE (
  item_id uuid,
  request_id uuid,
  block_name text,
  field text,
  old_value jsonb,
  new_value jsonb,
  published_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id, c.request_id, i.block_name,
    c.field, c.old_value, c.new_value, c.published_at
  FROM program_change_log c
  JOIN program_request_items i ON i.id = c.item_id
  JOIN partners p ON p.id = p_partner_id
  WHERE i.provider_id = p_partner_id
    AND c.published_at IS NOT NULL
    AND c.published_at > COALESCE(p.last_dashboard_seen_at, 'epoch'::timestamptz)
  ORDER BY c.published_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_partner_changes_since_last_seen(text) TO authenticated;

-- ============================================================
-- #13: customer changelog per item (token-validated)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_item_changelog(p_item_id uuid, p_customer_token text)
RETURNS TABLE (
  field text,
  old_value jsonb,
  new_value jsonb,
  published_at timestamptz,
  admin_note text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM program_request_items i
    JOIN program_requests r ON r.id = i.request_id
    WHERE i.id = p_item_id
      AND r.customer_token = p_customer_token
  ) INTO v_valid;

  IF NOT v_valid THEN
    RAISE EXCEPTION 'invalid_token_or_item';
  END IF;

  RETURN QUERY
    SELECT c.field, c.old_value, c.new_value, c.published_at, c.admin_note
    FROM program_change_log c
    WHERE c.item_id = p_item_id
      AND c.published_at IS NOT NULL
    ORDER BY c.published_at DESC
    LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_item_changelog(uuid, text) TO anon, authenticated;
