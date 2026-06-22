CREATE UNIQUE INDEX IF NOT EXISTS chat_conversations_one_customer_per_request
ON public.chat_conversations (request_id)
WHERE source = 'customer_portal'
  AND status <> 'closed'
  AND accommodation_id IS NULL
  AND source_partner_id IS NULL;