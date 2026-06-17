
-- Singleton cache for Google Places reviews
CREATE TABLE IF NOT EXISTS public.google_reviews_cache (
  id text PRIMARY KEY DEFAULT 'singleton' CHECK (id = 'singleton'),
  place_id text,
  rating numeric,
  review_count integer NOT NULL DEFAULT 0,
  reviews jsonb NOT NULL DEFAULT '[]'::jsonb,
  place_url text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.google_reviews_cache TO anon;
GRANT SELECT ON public.google_reviews_cache TO authenticated;
GRANT ALL ON public.google_reviews_cache TO service_role;

ALTER TABLE public.google_reviews_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read google reviews cache"
  ON public.google_reviews_cache FOR SELECT
  USING (true);

CREATE POLICY "Admins manage google reviews cache"
  ON public.google_reviews_cache FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_google_reviews_cache_updated_at
  BEFORE UPDATE ON public.google_reviews_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.google_reviews_cache (id) VALUES ('singleton') ON CONFLICT DO NOTHING;

-- Settings for Google reviews block
INSERT INTO public.app_settings (id, category, label, description, value_type, value)
VALUES
  ('google_place_id', 'system', 'Google Place ID', 'Google Place ID van Bureau Vlieland (te vinden via Google Place ID Finder). Nodig om reviews op te halen.', 'text', '""'::jsonb),
  ('google_reviews_show_count', 'system', 'Aantal Google reviews tonen', 'Hoeveel recente Google reviews worden getoond in het reviews-blok op de website (max 5).', 'number', '3'::jsonb)
ON CONFLICT (id) DO NOTHING;
