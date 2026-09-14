-- Deelnemers-opt-in voor WhatsApp-updates over hun programma.
-- Losstaand van program_requests.customer_phone (dat is de contactpersoon/
-- boeker); dit zijn de deelnemers die zichzelf via de gedeelde
-- deelnemerspagina (participant_token) aanmelden voor updates.
CREATE TABLE public.program_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.program_requests(id) ON DELETE CASCADE,
  participant_token text NOT NULL,
  name text,
  phone_number text NOT NULL,
  whatsapp_opt_in boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.program_participants TO anon, authenticated;
GRANT ALL ON public.program_participants TO service_role;

ALTER TABLE public.program_participants ENABLE ROW LEVEL SECURITY;

-- Een deelnemer mag alleen zichzelf aanmelden tegen een levende aanvraag
-- waarvan hij het participant_token kent — geen open insert-policy zoals bij
-- program_requests zelf, want hier staan telefoonnummers in.
CREATE POLICY "Participants can opt in via token"
  ON public.program_participants
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.program_requests pr
      WHERE pr.id = program_participants.request_id
        AND pr.participant_token = program_participants.participant_token
        AND pr.expires_at > now()
    )
  );

-- Geen SELECT-policy voor anon/authenticated: de lijst is alleen leesbaar
-- voor admins (adminscherm) en de service-role (broadcast edge function).
CREATE POLICY "Admins can manage participants"
  ON public.program_participants
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE INDEX idx_program_participants_request ON public.program_participants(request_id);

CREATE TRIGGER update_program_participants_updated_at
  BEFORE UPDATE ON public.program_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
