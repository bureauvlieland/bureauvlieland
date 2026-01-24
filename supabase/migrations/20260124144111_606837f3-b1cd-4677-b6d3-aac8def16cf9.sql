-- Allow partners to update their own data via auth
CREATE POLICY "Partners can update own data via auth" 
ON public.partners 
FOR UPDATE 
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());