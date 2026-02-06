-- Create project_communications table for tracking all project-related communications
CREATE TABLE public.project_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.program_requests(id) ON DELETE CASCADE,
  accommodation_id UUID REFERENCES public.accommodation_requests(id) ON DELETE CASCADE,
  communication_type TEXT NOT NULL DEFAULT 'note',
  direction TEXT NOT NULL DEFAULT 'internal',
  subject TEXT,
  content TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  logged_by UUID REFERENCES auth.users(id),
  logged_at TIMESTAMPTZ DEFAULT now(),
  communication_date TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure at least one reference is set
  CONSTRAINT check_reference CHECK (request_id IS NOT NULL OR accommodation_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.project_communications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can manage communications
CREATE POLICY "Admins can manage communications" 
  ON public.project_communications 
  FOR ALL 
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Create indexes for faster lookups
CREATE INDEX idx_project_communications_request_id ON public.project_communications(request_id);
CREATE INDEX idx_project_communications_accommodation_id ON public.project_communications(accommodation_id);
CREATE INDEX idx_project_communications_logged_at ON public.project_communications(logged_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_project_communications_updated_at
  BEFORE UPDATE ON public.project_communications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.project_communications IS 'Stores manual communication logs (emails, phone calls, notes) related to projects';