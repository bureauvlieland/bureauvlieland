-- Create email_log table for tracking all transactional emails
CREATE TABLE public.email_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Email details
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  
  -- Related entities
  related_request_id UUID REFERENCES public.program_requests(id) ON DELETE SET NULL,
  related_accommodation_id UUID REFERENCES public.accommodation_requests(id) ON DELETE SET NULL,
  related_partner_id TEXT,
  related_item_id UUID REFERENCES public.program_request_items(id) ON DELETE SET NULL,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  mailjet_message_id TEXT,
  
  -- Metadata
  sent_by TEXT, -- 'system', 'admin', edge function name
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view email logs
CREATE POLICY "Admins can view all email logs"
  ON public.email_log FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Edge functions can insert logs (via service role)
CREATE POLICY "Anyone can insert email logs"
  ON public.email_log FOR INSERT
  WITH CHECK (true);

-- Create indexes for efficient querying
CREATE INDEX idx_email_log_type ON public.email_log(email_type);
CREATE INDEX idx_email_log_recipient ON public.email_log(recipient_email);
CREATE INDEX idx_email_log_created ON public.email_log(created_at DESC);
CREATE INDEX idx_email_log_request ON public.email_log(related_request_id);
CREATE INDEX idx_email_log_accommodation ON public.email_log(related_accommodation_id);
CREATE INDEX idx_email_log_status ON public.email_log(status);