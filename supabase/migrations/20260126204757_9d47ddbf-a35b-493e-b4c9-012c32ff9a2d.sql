-- Partners kunnen hun eigen building blocks updaten (beperkte velden)
-- Dit wordt gebruikt voor de "Mijn Aanbod" pagina in de Partner Portal
CREATE POLICY "Partners can update own blocks" 
ON public.building_blocks
FOR UPDATE
USING (provider_id = get_partner_id(auth.uid()))
WITH CHECK (provider_id = get_partner_id(auth.uid()));

-- Partners kunnen nieuwe building blocks voorstellen (insert)
-- Deze worden aangemaakt met is_published = false, admin moet goedkeuren
CREATE POLICY "Partners can insert own blocks" 
ON public.building_blocks
FOR INSERT
WITH CHECK (
  provider_id = get_partner_id(auth.uid()) 
  AND is_published = false
);