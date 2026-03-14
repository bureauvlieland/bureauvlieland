
-- Add MAP tenant slug to partners
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS map_tenant_slug text DEFAULT NULL;

-- Create map_bookings table for tracking direct bookings via Bureau Vlieland
CREATE TABLE public.map_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id text NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  map_tenant_slug text NOT NULL,
  map_activity_id text NOT NULL,
  map_booking_id text,
  activity_name text NOT NULL,
  departure timestamp with time zone NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  number_of_adults integer NOT NULL DEFAULT 1,
  number_of_children integer NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  commission_percentage numeric NOT NULL DEFAULT 10,
  commission_amount numeric NOT NULL DEFAULT 0,
  booking_status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.map_bookings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage map_bookings
CREATE POLICY "Admins can manage map bookings"
  ON public.map_bookings
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_map_bookings_updated_at
  BEFORE UPDATE ON public.map_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
