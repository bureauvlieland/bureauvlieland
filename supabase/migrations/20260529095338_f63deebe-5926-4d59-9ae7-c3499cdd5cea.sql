
-- 1. whatsapp_contacts
CREATE TABLE public.whatsapp_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  whatsapp_name text,
  partner_id text,
  request_id uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_contacts TO authenticated;
GRANT ALL ON public.whatsapp_contacts TO service_role;

ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage whatsapp contacts"
  ON public.whatsapp_contacts
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE INDEX idx_whatsapp_contacts_phone ON public.whatsapp_contacts(phone_number);
CREATE INDEX idx_whatsapp_contacts_partner ON public.whatsapp_contacts(partner_id);
CREATE INDEX idx_whatsapp_contacts_request ON public.whatsapp_contacts(request_id);

CREATE TRIGGER update_whatsapp_contacts_updated_at
  BEFORE UPDATE ON public.whatsapp_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. chat_conversations: allow 'whatsapp' source + add whatsapp_contact_id & phone_number
ALTER TABLE public.chat_conversations
  DROP CONSTRAINT IF EXISTS chat_conversations_source_check;

ALTER TABLE public.chat_conversations
  ADD CONSTRAINT chat_conversations_source_check
  CHECK (source = ANY (ARRAY['customer_portal'::text, 'partner_portal'::text, 'whatsapp'::text]));

ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS whatsapp_contact_id uuid REFERENCES public.whatsapp_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phone_number text;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_whatsapp_contact
  ON public.chat_conversations(whatsapp_contact_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_phone_number
  ON public.chat_conversations(phone_number);

-- 3. chat_messages: allow 'customer' sender_type + add twilio_message_sid
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_sender_type_check;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_sender_type_check
  CHECK (sender_type = ANY (ARRAY['visitor'::text, 'admin'::text, 'customer'::text]));

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS twilio_message_sid text;

CREATE INDEX IF NOT EXISTS idx_chat_messages_twilio_sid
  ON public.chat_messages(twilio_message_sid)
  WHERE twilio_message_sid IS NOT NULL;
