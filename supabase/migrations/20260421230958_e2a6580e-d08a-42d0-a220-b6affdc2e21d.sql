CREATE POLICY "Billing lines readable via active request"
ON public.program_item_billing_lines
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.program_request_items pri
    JOIN public.program_requests pr ON pr.id = pri.request_id
    WHERE pri.id = program_item_billing_lines.item_id
      AND pr.expires_at > now()
  )
);