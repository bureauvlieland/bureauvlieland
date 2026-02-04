-- Drop the overly permissive public SELECT policy that exposes sensitive partner data
DROP POLICY IF EXISTS "Partners are publicly readable" ON public.partners;