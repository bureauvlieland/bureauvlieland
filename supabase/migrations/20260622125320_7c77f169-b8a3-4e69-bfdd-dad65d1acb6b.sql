
-- Verscherp guard_item_status_consistency: confirmed/bevestigd alleen toegestaan
-- als het écht een bureau-managed item is, of als de partner heeft geantwoord.
CREATE OR REPLACE FUNCTION public.guard_item_status_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_status_change boolean;
  v_is_quote_status_change boolean;
  v_is_bureau_managed boolean;
BEGIN
  -- Alleen handhaven op werkelijke transities naar confirmed/bevestigd,
  -- zodat bestaande historische rijen niet breken bij ongerelateerde updates.
  v_is_status_change := (TG_OP = 'INSERT')
    OR (OLD.status IS DISTINCT FROM NEW.status);
  v_is_quote_status_change := (TG_OP = 'INSERT')
    OR (OLD.item_quote_status IS DISTINCT FROM NEW.item_quote_status);

  -- Niets te valideren als status én item_quote_status onveranderd zijn.
  IF NOT v_is_status_change AND NOT v_is_quote_status_change THEN
    RETURN NEW;
  END IF;

  -- Alleen ingrijpen als nieuwe waarde 'confirmed'/'accepted' is OF
  -- item_quote_status 'bevestigd' wordt.
  IF NEW.status NOT IN ('confirmed','accepted')
     AND COALESCE(NEW.item_quote_status,'') <> 'bevestigd' THEN
    RETURN NEW;
  END IF;

  -- 1) Echte bureau-interne post (uren, materiaal, toeristenbelasting, etc.)
  IF NEW.provider_id = 'bureau' OR NEW.provider_id = 'bureau-vlieland' THEN
    RETURN NEW;
  END IF;

  -- 2) Managed services: ferries, fietsen, bagagevervoer (category 'vervoer')
  --    worden centraal geboekt door Bureau Vlieland en mogen direct confirmed.
  v_is_bureau_managed := NEW.block_type = 'bureau'
    AND NEW.provider_id IN ('rederij','fietsverhuur','bagagevervoer-vlieland')
    AND NEW.block_category = 'vervoer';
  IF v_is_bureau_managed THEN
    RETURN NEW;
  END IF;

  -- 3) Partner heeft daadwerkelijk gereageerd: geofferd of prijswijziging gezien.
  IF NEW.quoted_at IS NOT NULL
     OR NEW.partner_price_change_acknowledged_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 4) Alternative- / cancelled-pad blijft toegestaan (admin/klant beslist).
  IF NEW.status = 'alternative' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Item % (%) kan niet op status "%"/"%" worden gezet voordat partner % het heeft bevestigd of een tegenvoorstel heeft gedaan.',
    NEW.id, NEW.block_name, NEW.status, NEW.item_quote_status, NEW.provider_name
    USING HINT = 'Stuur het item eerst naar de partner via "Versturen naar partners" of laat de partner een offerte/prijsbevestiging geven.',
          ERRCODE = 'check_violation';
END;
$function$;
