ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS accommodation_request_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_accommodation_request_id
  ON public.chat_conversations(accommodation_request_id);