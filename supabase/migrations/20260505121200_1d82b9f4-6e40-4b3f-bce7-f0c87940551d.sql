CREATE OR REPLACE FUNCTION public.guard_item_status_consistency()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Bureau-interne kosten (uren, toeristenbelasting, materiaalhuur, etc.)
  -- doorlopen geen partner-/klantakkoord-traject en mogen direct 'confirmed' zijn.
  IF NEW.block_type = 'bureau' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('confirmed', 'alternative')
     AND COALESCE(NEW.skip_partner_notification, false) = true
     AND NEW.customer_approved_at IS NULL
     AND COALESCE(NEW.item_quote_status, '') <> 'bevestigd'
  THEN
    RAISE EXCEPTION 'Item % kan niet op status "%" worden gezet zolang het nog niet naar de partner is verstuurd (skip_partner_notification=true).',
      NEW.id, NEW.status
      USING HINT = 'Verstuur het onderdeel eerst naar de partner of laat de klant akkoord geven.';
  END IF;
  RETURN NEW;
END;
$function$;