
-- 1) Prevent partners from changing provider_id on building_blocks
CREATE OR REPLACE FUNCTION public.prevent_partner_provider_id_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.provider_id IS DISTINCT FROM OLD.provider_id THEN
    RAISE EXCEPTION 'Partners cannot change provider_id of a building block';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_partner_provider_id_change ON public.building_blocks;
CREATE TRIGGER trg_prevent_partner_provider_id_change
BEFORE UPDATE ON public.building_blocks
FOR EACH ROW EXECUTE FUNCTION public.prevent_partner_provider_id_change();

-- 2) Secure customer program request history inserts via token-verified RPC
CREATE OR REPLACE FUNCTION public.append_customer_program_history(
  p_request_id uuid,
  p_customer_token text,
  p_action text,
  p_actor_name text,
  p_new_value jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  IF p_action IS NULL OR char_length(p_action) = 0 OR char_length(p_action) > 100 THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;
  IF char_length(COALESCE(p_actor_name, '')) > 200 THEN
    RAISE EXCEPTION 'Invalid actor_name';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.program_requests
    WHERE id = p_request_id
      AND customer_token = p_customer_token
      AND created_at > now() - interval '24 hours'
  ) INTO v_ok;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Not authorized for this request';
  END IF;

  INSERT INTO public.program_request_history (request_id, action, actor, actor_name, new_value)
  VALUES (p_request_id, p_action, 'customer', p_actor_name, p_new_value);
END;
$$;

GRANT EXECUTE ON FUNCTION public.append_customer_program_history(uuid, text, text, text, jsonb) TO anon, authenticated;

-- Drop the loose anon insert policy
DROP POLICY IF EXISTS "Anon can append history to recent requests only" ON public.program_request_history;

-- 3) Tighten shared_programs share_code to be unguessable (>= 16 chars)
DROP POLICY IF EXISTS "Anyone can create shared programs" ON public.shared_programs;
CREATE POLICY "Anyone can create shared programs"
ON public.shared_programs
FOR INSERT
TO public
WITH CHECK (
  char_length(btrim(COALESCE(share_code, ''))) >= 16
  AND char_length(btrim(COALESCE(share_code, ''))) <= 100
);
