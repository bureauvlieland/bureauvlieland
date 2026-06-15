
-- =====================================================
-- social_settings (singleton)
-- =====================================================
CREATE TABLE public.social_settings (
  id text PRIMARY KEY DEFAULT 'singleton' CHECK (id = 'singleton'),
  cadence_per_week int NOT NULL DEFAULT 3,
  posting_days text[] NOT NULL DEFAULT ARRAY['mon','wed','fri'],
  posting_time text NOT NULL DEFAULT '10:00',
  sources_enabled jsonb NOT NULL DEFAULT '{"building_blocks":true,"partners":true,"projects":true,"seasonal":true,"partner_spotlight":true}'::jsonb,
  hashtag_sets jsonb NOT NULL DEFAULT '{"general":["#Vlieland","#Waddeneilanden","#BureauVlieland"],"catering":["#cateringVlieland","#localfood"],"activiteit":["#bedrijfsuitje","#teambuilding"],"logies":["#overnachtenVlieland"]}'::jsonb,
  default_ctas jsonb NOT NULL DEFAULT '{"bouwstenen":"/bouwstenen","catering":"/catering","programma":"/programma-samenstellen"}'::jsonb,
  tone_of_voice text DEFAULT 'Warm, lokaal, ervaren reisagent. Vermijd clichés. Spreek de lezer aan met "je".',
  meta_page_id text,
  meta_page_name text,
  meta_ig_user_id text,
  meta_ig_username text,
  meta_page_token text,
  meta_token_expires_at timestamptz,
  meta_connected_at timestamptz,
  publishing_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_settings TO authenticated;
GRANT ALL ON public.social_settings TO service_role;

ALTER TABLE public.social_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage social settings"
  ON public.social_settings FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.social_settings (id) VALUES ('singleton') ON CONFLICT DO NOTHING;

CREATE TRIGGER trg_social_settings_updated_at
  BEFORE UPDATE ON public.social_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- social_media_assets
-- =====================================================
CREATE TABLE public.social_media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  title text,
  note text,
  project_id uuid REFERENCES public.program_requests(id) ON DELETE SET NULL,
  partner_id text REFERENCES public.partners(id) ON DELETE SET NULL,
  building_block_id text REFERENCES public.building_blocks(id) ON DELETE SET NULL,
  anonymize_customer boolean NOT NULL DEFAULT true,
  tags text[] NOT NULL DEFAULT '{}',
  uploaded_by uuid,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_media_assets TO authenticated;
GRANT ALL ON public.social_media_assets TO service_role;

ALTER TABLE public.social_media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage social assets"
  ON public.social_media_assets FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_social_media_assets_updated_at
  BEFORE UPDATE ON public.social_media_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_social_media_assets_created ON public.social_media_assets(created_at DESC);
CREATE INDEX idx_social_media_assets_project ON public.social_media_assets(project_id);

-- =====================================================
-- social_posts
-- =====================================================
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','publishing','published','failed','rejected')),
  caption text NOT NULL DEFAULT '',
  hashtags text[] NOT NULL DEFAULT '{}',
  media_urls text[] NOT NULL DEFAULT '{}',
  channels text[] NOT NULL DEFAULT ARRAY['instagram','facebook'],
  scheduled_for timestamptz,
  published_at timestamptz,
  source_type text,
  source_id text,
  source_summary text,
  external_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  permalinks jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  ai_model text,
  ai_raw jsonb,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  rejected_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_posts TO authenticated;
GRANT ALL ON public.social_posts TO service_role;

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage social posts"
  ON public.social_posts FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_social_posts_updated_at
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_social_posts_status_scheduled ON public.social_posts(status, scheduled_for);
CREATE INDEX idx_social_posts_source ON public.social_posts(source_type, source_id);
CREATE INDEX idx_social_posts_created ON public.social_posts(created_at DESC);
