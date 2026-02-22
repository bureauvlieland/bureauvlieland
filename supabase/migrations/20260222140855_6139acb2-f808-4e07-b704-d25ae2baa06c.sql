
-- Chat conversations table
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('customer_portal', 'partner_portal')),
  source_token text,
  source_partner_id text,
  visitor_name text NOT NULL DEFAULT '',
  visitor_email text NOT NULL DEFAULT '',
  request_id uuid REFERENCES public.program_requests(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'waiting', 'closed')),
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('visitor', 'admin')),
  sender_name text NOT NULL DEFAULT '',
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Chat admin presence table
CREATE TABLE public.chat_admin_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  is_online boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_admin_presence ENABLE ROW LEVEL SECURITY;

-- RLS: chat_conversations
-- Admins full access
CREATE POLICY "Admins can manage all chat conversations"
ON public.chat_conversations FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Visitors can read their own conversations via source_token (anon)
CREATE POLICY "Visitors can read own conversations via token"
ON public.chat_conversations FOR SELECT
USING (source_token IS NOT NULL AND source_token != '');

-- Partners can read their own conversations
CREATE POLICY "Partners can read own conversations"
ON public.chat_conversations FOR SELECT
USING (source_partner_id = get_partner_id(auth.uid()));

-- Anyone can create conversations (anon for customer portal, authenticated for partner)
CREATE POLICY "Anyone can create chat conversations"
ON public.chat_conversations FOR INSERT
WITH CHECK (true);

-- Visitors can update their own conversations (status changes)
CREATE POLICY "Visitors can update own conversations via token"
ON public.chat_conversations FOR UPDATE
USING (source_token IS NOT NULL AND source_token != '');

-- Partners can update their own conversations
CREATE POLICY "Partners can update own conversations"
ON public.chat_conversations FOR UPDATE
USING (source_partner_id = get_partner_id(auth.uid()));

-- RLS: chat_messages
-- Admins full access
CREATE POLICY "Admins can manage all chat messages"
ON public.chat_messages FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Messages readable via conversation token (anon customers)
CREATE POLICY "Messages readable via conversation token"
ON public.chat_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.chat_conversations c
  WHERE c.id = chat_messages.conversation_id
  AND c.source_token IS NOT NULL AND c.source_token != ''
));

-- Messages readable by partner owner
CREATE POLICY "Messages readable by partner"
ON public.chat_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.chat_conversations c
  WHERE c.id = chat_messages.conversation_id
  AND c.source_partner_id = get_partner_id(auth.uid())
));

-- Anyone can insert messages (visitor or admin)
CREATE POLICY "Anyone can insert chat messages"
ON public.chat_messages FOR INSERT
WITH CHECK (true);

-- RLS: chat_admin_presence
-- Admins can manage their own presence
CREATE POLICY "Admins can manage own presence"
ON public.chat_admin_presence FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Anyone can read admin presence (to check if admin is online)
CREATE POLICY "Anyone can read admin presence"
ON public.chat_admin_presence FOR SELECT
USING (true);

-- Updated_at trigger for conversations
CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_admin_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;

-- Indexes
CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_conversations_source_token ON public.chat_conversations(source_token);
CREATE INDEX idx_chat_conversations_source_partner_id ON public.chat_conversations(source_partner_id);
CREATE INDEX idx_chat_conversations_status ON public.chat_conversations(status);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);
