-- Add audience column to distinguish admin-internal vs customer↔partner threads
ALTER TABLE public.project_communications
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'admin';

ALTER TABLE public.project_communications
  ADD CONSTRAINT project_communications_audience_check
  CHECK (audience IN ('admin', 'customer_partner'));

CREATE INDEX IF NOT EXISTS idx_project_communications_audience
  ON public.project_communications (accommodation_id, audience, communication_date DESC);

-- Backfill: existing rows logged by send-customer-accommodation-message should be audience='customer_partner'
UPDATE public.project_communications
SET audience = 'customer_partner'
WHERE metadata->>'message_preview' IS NOT NULL
  AND communication_type = 'email_out'
  AND accommodation_id IS NOT NULL
  AND audience = 'admin';

-- RLS: partners can read customer_partner rows for their accommodation quotes
CREATE POLICY "Partners can read customer-partner thread"
ON public.project_communications
FOR SELECT
USING (
  audience = 'customer_partner'
  AND accommodation_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.accommodation_quotes aq
    WHERE aq.request_id = project_communications.accommodation_id
      AND aq.partner_id = public.get_partner_id(auth.uid())
  )
);

-- RLS: partners can insert into the customer-partner thread for their own quotes
CREATE POLICY "Partners can insert customer-partner messages"
ON public.project_communications
FOR INSERT
WITH CHECK (
  audience = 'customer_partner'
  AND accommodation_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.accommodation_quotes aq
    WHERE aq.request_id = project_communications.accommodation_id
      AND aq.partner_id = public.get_partner_id(auth.uid())
  )
);