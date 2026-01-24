-- Add auth_user_id to partners table for Supabase Auth integration
ALTER TABLE public.partners
ADD COLUMN auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create unique index on auth_user_id (nullable, so partial index)
CREATE UNIQUE INDEX idx_partners_auth_user_id ON public.partners(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Add quoted price fields to program_request_items
ALTER TABLE public.program_request_items
ADD COLUMN quoted_price numeric,
ADD COLUMN quoted_at timestamp with time zone,
ADD COLUMN quoted_notes text;

-- Update RLS policy for partners to allow authenticated partner access
CREATE POLICY "Partners can view own data via auth" 
ON public.partners 
FOR SELECT 
TO authenticated
USING (auth_user_id = auth.uid());

-- Create security definer function to check if user is a partner
CREATE OR REPLACE FUNCTION public.is_partner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.partners
    WHERE auth_user_id = _user_id
      AND is_active = true
  )
$$;

-- Function to get partner_id from auth user
CREATE OR REPLACE FUNCTION public.get_partner_id(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.partners
  WHERE auth_user_id = _user_id
    AND is_active = true
  LIMIT 1
$$;

-- Policy for partners to view their assigned items
CREATE POLICY "Partners can view their assigned items via auth" 
ON public.program_request_items 
FOR SELECT 
TO authenticated
USING (
  provider_id = public.get_partner_id(auth.uid())
);

-- Policy for partners to update their assigned items
CREATE POLICY "Partners can update their assigned items via auth" 
ON public.program_request_items 
FOR UPDATE 
TO authenticated
USING (
  provider_id = public.get_partner_id(auth.uid())
);