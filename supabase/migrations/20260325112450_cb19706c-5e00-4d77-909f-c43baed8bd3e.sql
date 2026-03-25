CREATE POLICY "Public can view MAP-linked partners" 
ON public.partners 
FOR SELECT 
TO anon, authenticated 
USING (map_tenant_slug IS NOT NULL AND is_active = true);