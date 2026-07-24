
-- 1) app_settings: safelist categorieën voor is_public
ALTER TABLE public.app_settings
  DROP CONSTRAINT IF EXISTS app_settings_is_public_safe_categories;
ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_is_public_safe_categories
  CHECK (
    is_public = false
    OR category IN ('bureau','pricing','vat','commission','features','system')
  );

-- 2) Chat tabellen: restrictieve deny-anon policies (defense-in-depth naast bestaande partner/admin policies)
DROP POLICY IF EXISTS "deny_anon_chat_conversations" ON public.chat_conversations;
CREATE POLICY "deny_anon_chat_conversations"
  ON public.chat_conversations
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "deny_anon_chat_messages" ON public.chat_messages;
CREATE POLICY "deny_anon_chat_messages"
  ON public.chat_messages
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "deny_anon_chat_admin_presence" ON public.chat_admin_presence;
CREATE POLICY "deny_anon_chat_admin_presence"
  ON public.chat_admin_presence
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- 3) Column-level REVOKE op accommodation_quotes voor authenticated
--    Partners mogen alleen niet-financiële velden bijwerken; commissie / facturatie / klant-akkoord
--    velden en koppelingen zijn nu ook op grant-niveau ontoegankelijk.
REVOKE UPDATE (
  commission_percentage,
  commission_amount,
  commission_status,
  commission_invoiced_at,
  invoiced_amount,
  invoiced_number,
  invoiced_date,
  actual_invoiced_excl_vat,
  proforma_commission,
  customer_terms_accepted_at,
  customer_signature_name,
  customer_terms_ip,
  partner_id,
  request_id
) ON public.accommodation_quotes FROM authenticated;

-- 4) Column-level REVOKE op partner_purchase_invoices voor authenticated
REVOKE UPDATE (
  status,
  approved_at,
  paid_at,
  forwarded_to_accounting_at,
  forwarded_by,
  payment_batch_id,
  amount_excl_vat,
  amount_incl_vat,
  vat_amount,
  vat_rate,
  partner_id,
  request_id,
  item_id,
  registered_by
) ON public.partner_purchase_invoices FROM authenticated;
