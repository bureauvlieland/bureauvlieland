UPDATE public.program_request_items
SET pending_changed_at = now()
WHERE pending_changed_at IS NULL
  AND (
    pending_block_name IS NOT NULL
    OR pending_admin_price_notes IS NOT NULL
    OR pending_customer_notes IS NOT NULL
    OR pending_partner_instructions IS NOT NULL
    OR pending_preferred_time IS NOT NULL
    OR pending_day_index IS NOT NULL
    OR pending_admin_price_override IS NOT NULL
    OR pending_price_type IS NOT NULL
    OR pending_location_address IS NOT NULL
    OR pending_provider_id IS NOT NULL
    OR pending_block_type IS NOT NULL
    OR pending_override_people IS NOT NULL
    OR pending_marked_for_removal = true
    OR pending_added = true
  );