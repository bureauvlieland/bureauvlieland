CREATE TABLE public.program_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  email text NOT NULL,
  payload jsonb NOT NULL,
  source text DEFAULT 'exit_intent',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  recovered_at timestamptz,
  last_email_sent_at timestamptz,
  email_send_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_program_drafts_token ON public.program_drafts(token);
CREATE INDEX idx_program_drafts_email ON public.program_drafts(lower(email));
CREATE INDEX idx_program_drafts_expires ON public.program_drafts(expires_at) WHERE recovered_at IS NULL;

GRANT ALL ON public.program_drafts TO service_role;

ALTER TABLE public.program_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view drafts" ON public.program_drafts
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER program_drafts_updated_at
  BEFORE UPDATE ON public.program_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();