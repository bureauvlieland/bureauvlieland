ALTER TABLE public.chat_conversations DROP CONSTRAINT IF EXISTS chat_conversations_source_check;
ALTER TABLE public.chat_conversations ADD CONSTRAINT chat_conversations_source_check
  CHECK (source = ANY (ARRAY['customer_portal'::text, 'partner_portal'::text, 'whatsapp'::text, 'presales'::text]));