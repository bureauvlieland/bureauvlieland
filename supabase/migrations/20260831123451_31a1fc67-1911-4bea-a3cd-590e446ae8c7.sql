CREATE OR REPLACE FUNCTION public.sanitize_anon_program_request_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (SELECT auth.role()) = 'anon' THEN
    NEW.admin_price_override := NULL;
    NEW.commission_percentage := NULL;
    IF NEW.block_id IS NOT NULL THEN
      -- bb.block_type is een enum, NEW.block_type is text: expliciet casten,
      -- anders faalt COALESCE met "types building_block_type and text cannot be matched".
      SELECT bb.provider_id,
             COALESCE(p.name, bb.provider_id, 'Bureau Vlieland'),
             p.email,
             COALESCE(bb.block_type::text, NEW.block_type)
        INTO NEW.provider_id, NEW.provider_name, NEW.provider_email, NEW.block_type
      FROM public.building_blocks bb
      LEFT JOIN public.partners p ON p.id = bb.provider_id
      WHERE bb.id = NEW.block_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;