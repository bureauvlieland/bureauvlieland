-- Extend app_role enum is not needed, we'll use partner_type as a text field

-- Add partner_type and accommodation fields to partners table
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS partner_type text DEFAULT 'activity_provider',
ADD COLUMN IF NOT EXISTS accommodation_types jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS accommodation_commission_percentage numeric DEFAULT 10.00;

-- Add constraint for partner_type
ALTER TABLE public.partners 
ADD CONSTRAINT partners_partner_type_check 
CHECK (partner_type IN ('activity_provider', 'accommodation', 'both'));

-- Create accommodation_requests table
CREATE TABLE public.accommodation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  customer_company text,
  
  -- Dates and guests
  arrival_date date NOT NULL,
  departure_date date NOT NULL,
  number_of_guests integer NOT NULL,
  
  -- Accommodation preferences
  accommodation_type text NOT NULL DEFAULT 'no_preference',
  room_count integer,
  room_occupancy text,
  room_types jsonb DEFAULT '[]'::jsonb,
  
  -- Location and facilities
  location_preference jsonb DEFAULT '[]'::jsonb,
  facilities_required jsonb DEFAULT '[]'::jsonb,
  
  -- Budget and wishes
  budget_range text,
  special_requests text,
  
  -- Program integration
  wants_activities boolean DEFAULT false,
  linked_program_id uuid REFERENCES public.program_requests(id),
  
  -- Status tracking
  status text NOT NULL DEFAULT 'submitted',
  admin_notes text,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '90 days'),
  
  -- Constraints
  CONSTRAINT accommodation_requests_type_check 
    CHECK (accommodation_type IN ('hotel', 'vacation_home', 'group_accommodation', 'camping', 'no_preference')),
  CONSTRAINT accommodation_requests_status_check 
    CHECK (status IN ('draft', 'submitted', 'processing', 'quoted', 'accepted', 'cancelled', 'expired')),
  CONSTRAINT accommodation_requests_dates_check 
    CHECK (departure_date > arrival_date)
);

-- Create accommodation_quotes table (offers from accommodation partners)
CREATE TABLE public.accommodation_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.accommodation_requests(id) ON DELETE CASCADE,
  partner_id text NOT NULL REFERENCES public.partners(id),
  
  -- Accommodation details
  accommodation_name text NOT NULL,
  description text,
  room_configuration jsonb DEFAULT '[]'::jsonb,
  
  -- Pricing
  price_total numeric NOT NULL,
  price_per_person_per_night numeric,
  price_includes_vat boolean DEFAULT true,
  vat_rate numeric DEFAULT 9,
  
  -- What's included
  includes jsonb DEFAULT '[]'::jsonb,
  conditions text,
  
  -- Validity
  valid_until date NOT NULL,
  
  -- Status
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamp with time zone,
  selected_at timestamp with time zone,
  
  -- Partner notes
  partner_notes text,
  
  -- Invoice tracking (same model as activities)
  invoiced_amount numeric,
  invoiced_number text,
  invoiced_date date,
  invoiced_file_path text,
  commission_percentage numeric,
  commission_amount numeric,
  commission_status text DEFAULT 'not_applicable',
  commission_invoiced_at timestamp with time zone,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT accommodation_quotes_status_check 
    CHECK (status IN ('pending', 'submitted', 'selected', 'rejected', 'expired')),
  CONSTRAINT accommodation_quotes_commission_status_check 
    CHECK (commission_status IN ('not_applicable', 'pending', 'invoiced', 'paid'))
);

-- Create indexes for performance
CREATE INDEX idx_accommodation_requests_customer_token ON public.accommodation_requests(customer_token);
CREATE INDEX idx_accommodation_requests_status ON public.accommodation_requests(status);
CREATE INDEX idx_accommodation_requests_dates ON public.accommodation_requests(arrival_date, departure_date);
CREATE INDEX idx_accommodation_quotes_request_id ON public.accommodation_quotes(request_id);
CREATE INDEX idx_accommodation_quotes_partner_id ON public.accommodation_quotes(partner_id);
CREATE INDEX idx_partners_partner_type ON public.partners(partner_type);

-- Enable RLS
ALTER TABLE public.accommodation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodation_quotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accommodation_requests

-- Anyone can create requests (public form)
CREATE POLICY "Anyone can create accommodation requests"
ON public.accommodation_requests FOR INSERT
WITH CHECK (true);

-- Requests are readable by token (customer access)
CREATE POLICY "Accommodation requests readable by token"
ON public.accommodation_requests FOR SELECT
USING (expires_at > now());

-- Requests can be updated by token (customer can update own request)
CREATE POLICY "Accommodation requests updatable by token"
ON public.accommodation_requests FOR UPDATE
USING (expires_at > now());

-- Admins can view all requests
CREATE POLICY "Admins can view all accommodation requests"
ON public.accommodation_requests FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can update all requests
CREATE POLICY "Admins can update all accommodation requests"
ON public.accommodation_requests FOR UPDATE
USING (is_admin(auth.uid()));

-- RLS Policies for accommodation_quotes

-- Admins can do everything with quotes
CREATE POLICY "Admins can manage all accommodation quotes"
ON public.accommodation_quotes FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Partners can view quotes assigned to them
CREATE POLICY "Partners can view their accommodation quotes"
ON public.accommodation_quotes FOR SELECT
USING (partner_id = get_partner_id(auth.uid()));

-- Partners can update their own quotes
CREATE POLICY "Partners can update their accommodation quotes"
ON public.accommodation_quotes FOR UPDATE
USING (partner_id = get_partner_id(auth.uid()));

-- Quotes are readable via request token (for customer to see offers)
CREATE POLICY "Quotes readable via request"
ON public.accommodation_quotes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.accommodation_requests ar
    WHERE ar.id = accommodation_quotes.request_id
    AND ar.expires_at > now()
  )
);

-- Create updated_at trigger for accommodation_requests
CREATE TRIGGER update_accommodation_requests_updated_at
BEFORE UPDATE ON public.accommodation_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for accommodation_quotes
CREATE TRIGGER update_accommodation_quotes_updated_at
BEFORE UPDATE ON public.accommodation_quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();