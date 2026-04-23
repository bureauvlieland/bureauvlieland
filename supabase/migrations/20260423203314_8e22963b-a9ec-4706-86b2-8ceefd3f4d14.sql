-- Vervang permissieve 'true' INSERT-policies door inhoudelijke validaties

-- 1. accommodation_requests
DROP POLICY IF EXISTS "Anyone can create accommodation requests" ON public.accommodation_requests;
CREATE POLICY "Anyone can create accommodation requests"
  ON public.accommodation_requests
  FOR INSERT
  WITH CHECK (
    char_length(btrim(customer_name)) BETWEEN 1 AND 200
    AND char_length(btrim(customer_email)) BETWEEN 5 AND 320
    AND customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(coalesce(customer_phone, '')) <= 50
    AND char_length(coalesce(customer_company, '')) <= 200
    AND char_length(coalesce(special_requests, '')) <= 5000
    AND number_of_guests BETWEEN 1 AND 10000
    AND arrival_date <= departure_date
  );

-- 2. chat_conversations
DROP POLICY IF EXISTS "Anyone can create chat conversations" ON public.chat_conversations;
CREATE POLICY "Anyone can create chat conversations"
  ON public.chat_conversations
  FOR INSERT
  WITH CHECK (
    char_length(btrim(source)) BETWEEN 1 AND 50
    AND char_length(coalesce(visitor_name, '')) <= 200
    AND char_length(coalesce(visitor_email, '')) <= 320
  );

-- 3. chat_messages
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;
CREATE POLICY "Anyone can insert chat messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    sender_type IN ('admin', 'visitor', 'partner', 'customer', 'system')
    AND char_length(btrim(content)) BETWEEN 1 AND 10000
    AND char_length(coalesce(sender_name, '')) <= 200
    AND EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
    )
  );

-- 4. program_requests
DROP POLICY IF EXISTS "Anyone can create program requests" ON public.program_requests;
CREATE POLICY "Anyone can create program requests"
  ON public.program_requests
  FOR INSERT
  WITH CHECK (
    char_length(btrim(customer_name)) BETWEEN 1 AND 200
    AND char_length(btrim(customer_email)) BETWEEN 5 AND 320
    AND customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

-- 5. shared_programs (kolom heet share_code, niet share_token)
DROP POLICY IF EXISTS "Anyone can create shared programs" ON public.shared_programs;
CREATE POLICY "Anyone can create shared programs"
  ON public.shared_programs
  FOR INSERT
  WITH CHECK (
    char_length(btrim(coalesce(share_code, ''))) BETWEEN 1 AND 100
  );
