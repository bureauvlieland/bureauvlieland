
-- 1) Chat policies: restrict to authenticated role
DROP POLICY IF EXISTS "Partners can read own conversations" ON public.chat_conversations;
CREATE POLICY "Partners can read own conversations"
  ON public.chat_conversations FOR SELECT TO authenticated
  USING (source_partner_id = public.get_partner_id(auth.uid()));

DROP POLICY IF EXISTS "Partners can update own conversations" ON public.chat_conversations;
CREATE POLICY "Partners can update own conversations"
  ON public.chat_conversations FOR UPDATE TO authenticated
  USING (source_partner_id = public.get_partner_id(auth.uid()));

DROP POLICY IF EXISTS "Messages readable by partner" ON public.chat_messages;
CREATE POLICY "Messages readable by partner"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND c.source_partner_id = public.get_partner_id(auth.uid())
  ));

-- 2) Extend partner self-update guard with map_api_key and is_public
CREATE OR REPLACE FUNCTION public.guard_partner_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.auth_user_id IS DISTINCT FROM auth.uid()
     AND OLD.auth_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN NEW;
  END IF;

  IF NEW.commission_percentage IS DISTINCT FROM OLD.commission_percentage
     OR NEW.accommodation_commission_percentage IS DISTINCT FROM OLD.accommodation_commission_percentage
     OR NEW.partner_token IS DISTINCT FROM OLD.partner_token
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.partner_type IS DISTINCT FROM OLD.partner_type
     OR NEW.iban IS DISTINCT FROM OLD.iban
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.reference_number IS DISTINCT FROM OLD.reference_number
     OR NEW.map_api_key IS DISTINCT FROM OLD.map_api_key
     OR NEW.is_public IS DISTINCT FROM OLD.is_public
  THEN
    RAISE EXCEPTION 'Partners cannot modify restricted fields (commissions, token, role, IBAN, email, reference, map_api_key, visibility).'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$function$;
