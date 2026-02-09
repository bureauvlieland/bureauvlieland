-- Allow anyone to read app_settings (non-sensitive config values)
CREATE POLICY "Public can read app settings"
ON public.app_settings
FOR SELECT
USING (true);
