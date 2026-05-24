
-- Drop weak anon policies on chat_conversations
DROP POLICY IF EXISTS "Anyone can create chat conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Visitors can read own conversations via token" ON public.chat_conversations;
DROP POLICY IF EXISTS "Visitors can update own conversations via token" ON public.chat_conversations;

-- Drop weak anon policies on chat_messages
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Messages readable via conversation token" ON public.chat_messages;

-- Allow authenticated partners to create their own conversations
CREATE POLICY "Partners can create own conversations"
ON public.chat_conversations
FOR INSERT
TO authenticated
WITH CHECK (
  source_partner_id IS NOT NULL
  AND source_partner_id = public.get_partner_id(auth.uid())
);

-- Allow authenticated partners to insert messages in their own conversations
CREATE POLICY "Partners can insert messages in own conversations"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND c.source_partner_id = public.get_partner_id(auth.uid())
  )
);
