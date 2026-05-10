
CREATE TABLE public.ai_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_chat_conv_admin ON public.ai_chat_conversations(admin_user_id, last_message_at DESC);

ALTER TABLE public.ai_chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own conversations"
ON public.ai_chat_conversations FOR ALL
USING (public.is_admin(auth.uid()) AND admin_user_id = auth.uid())
WITH CHECK (public.is_admin(auth.uid()) AND admin_user_id = auth.uid());

CREATE TABLE public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content TEXT NOT NULL DEFAULT '',
  tool_calls JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_chat_msg_conv ON public.ai_chat_messages(conversation_id, created_at);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage messages of own conversations"
ON public.ai_chat_messages FOR ALL
USING (
  public.is_admin(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.ai_chat_conversations c
    WHERE c.id = conversation_id AND c.admin_user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_admin(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.ai_chat_conversations c
    WHERE c.id = conversation_id AND c.admin_user_id = auth.uid()
  )
);
