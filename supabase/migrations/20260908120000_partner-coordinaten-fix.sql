-- De beveiligingstrigger op partners verwees nog naar de kolom initial_password,
-- die op 23 april is verwijderd. Elke update op een partnerrecord die niet als
-- admin of service_role liep, brak daardoor met "record new has no field
-- initial_password". Zelfde functie, zonder die regel.
CREATE OR REPLACE FUNCTION public.protect_partner_self_update_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Alleen relevant als de partner zichzelf update via 'Partners can update own data via auth'
  IF NEW.auth_user_id IS NULL OR NEW.auth_user_id <> auth.uid() THEN
    RETURN NEW;
  END IF;

  IF NEW.id                                  IS DISTINCT FROM OLD.id
     OR NEW.auth_user_id                     IS DISTINCT FROM OLD.auth_user_id
     OR NEW.is_active                        IS DISTINCT FROM OLD.is_active
     OR NEW.partner_type                     IS DISTINCT FROM OLD.partner_type
     OR NEW.commission_percentage            IS DISTINCT FROM OLD.commission_percentage
     OR NEW.accommodation_commission_percentage IS DISTINCT FROM OLD.accommodation_commission_percentage
     OR NEW.extras_commission_percentage     IS DISTINCT FROM OLD.extras_commission_percentage
     OR NEW.map_api_key                      IS DISTINCT FROM OLD.map_api_key
     OR NEW.is_public                        IS DISTINCT FROM OLD.is_public
     OR NEW.pays_by_direct_debit             IS DISTINCT FROM OLD.pays_by_direct_debit
     OR NEW.email                            IS DISTINCT FROM OLD.email
  THEN
    RAISE EXCEPTION 'Partner mag rechten/financiële/admin-velden niet wijzigen op eigen partnerrecord';
  END IF;

  RETURN NEW;
END;
$$;

-- Datafout: één logiespartner had een breedtegraad zonder decimaalpunt
-- (532964885 in plaats van 53.2964885), waardoor de kaart niets kon tonen.
-- Herstel, en een controle zodat het niet opnieuw kan gebeuren.
update public.partners
   set location_lat = 53.2964885
 where location_lat > 90 and location_lat between 532964000 and 532965000;

alter table public.partners
  drop constraint if exists partners_location_lat_range,
  drop constraint if exists partners_location_lng_range;
alter table public.partners
  add constraint partners_location_lat_range check (location_lat is null or (location_lat >= -90 and location_lat <= 90)),
  add constraint partners_location_lng_range check (location_lng is null or (location_lng >= -180 and location_lng <= 180));
