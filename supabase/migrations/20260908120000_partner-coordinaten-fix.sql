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
