-- Create program_requests table for storing customer program submissions
CREATE TABLE public.program_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_token TEXT UNIQUE NOT NULL,
  
  -- Customer details
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_company TEXT,
  
  -- Program details
  number_of_people INTEGER NOT NULL DEFAULT 20,
  selected_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  general_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 days')
);

-- Create program_request_items table for individual activities with status tracking
CREATE TABLE public.program_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.program_requests(id) ON DELETE CASCADE,
  
  -- Activity details (snapshot from configurator)
  block_id TEXT NOT NULL,
  block_name TEXT NOT NULL,
  block_category TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  provider_email TEXT,
  block_type TEXT NOT NULL,
  price_indication TEXT,
  
  -- Day and time
  day_index INTEGER NOT NULL DEFAULT 0,
  preferred_time TEXT,
  customer_notes TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  status_note TEXT,
  status_updated_at TIMESTAMPTZ,
  status_updated_by TEXT,
  
  -- Version tracking
  version INTEGER NOT NULL DEFAULT 1,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create program_request_history table for audit trail
CREATE TABLE public.program_request_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.program_requests(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.program_request_items(id) ON DELETE SET NULL,
  
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  actor_name TEXT,
  
  old_value JSONB,
  new_value JSONB,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_program_requests_token ON public.program_requests(customer_token);
CREATE INDEX idx_program_requests_email ON public.program_requests(customer_email);
CREATE INDEX idx_program_request_items_request_id ON public.program_request_items(request_id);
CREATE INDEX idx_program_request_items_status ON public.program_request_items(status);
CREATE INDEX idx_program_request_history_request_id ON public.program_request_history(request_id);

-- Enable RLS
ALTER TABLE public.program_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_request_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for program_requests
CREATE POLICY "Program requests are readable by token" 
ON public.program_requests 
FOR SELECT 
USING (expires_at > now());

CREATE POLICY "Anyone can create program requests" 
ON public.program_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Program requests can be updated by token" 
ON public.program_requests 
FOR UPDATE 
USING (expires_at > now());

-- RLS Policies for program_request_items
CREATE POLICY "Items are readable via request" 
ON public.program_request_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.program_requests 
    WHERE id = request_id AND expires_at > now()
  )
);

CREATE POLICY "Anyone can create items" 
ON public.program_request_items 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Items can be updated" 
ON public.program_request_items 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.program_requests 
    WHERE id = request_id AND expires_at > now()
  )
);

CREATE POLICY "Items can be deleted" 
ON public.program_request_items 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.program_requests 
    WHERE id = request_id AND expires_at > now()
  )
);

-- RLS Policies for program_request_history
CREATE POLICY "History is readable via request" 
ON public.program_request_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.program_requests 
    WHERE id = request_id AND expires_at > now()
  )
);

CREATE POLICY "Anyone can create history" 
ON public.program_request_history 
FOR INSERT 
WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_program_requests_updated_at
BEFORE UPDATE ON public.program_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_program_request_items_updated_at
BEFORE UPDATE ON public.program_request_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();