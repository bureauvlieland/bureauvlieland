ALTER TABLE public.chat_conversations 
  ADD COLUMN accommodation_id UUID REFERENCES public.accommodation_requests(id),
  ADD COLUMN quote_id UUID REFERENCES public.accommodation_quotes(id);