-- Beoordelingen tonen op de site (docs/plan-reviews-oogsten.md, fase 2).
--
-- 1. Tripadvisor vervalt (besluit Erwin, 22 september 2026): kolom en
--    instelling weg; de bedankpagina verwijst alleen nog naar Google.
-- 2. Bestaande citaten (bron 'legacy') hebben geen score: rating mag leeg
--    zijn buiten de beoordelingen via de eigen pagina.
-- 3. View published_reviews: alleen gepubliceerde beoordelingen en alleen de
--    veilige kolommen (geen "wat kan beter", geen IP, geen toestemmings-
--    details), met de instappagina en de bouwstenen van het programma erbij,
--    zodat een landings- of activiteitpagina de passende beoordelingen kan
--    tonen. De view draait als eigenaar (security definer-gedrag), bewust:
--    zo blijft de tabel zelf dicht voor anon.
-- 4. De vier vaste citaten uit Testimonials.tsx verhuizen naar de tabel.

-- 1. Tripadvisor
alter table public.customer_reviews drop column if exists tripadvisor_clicked_at;
delete from public.app_settings where id = 'customer_review_tripadvisor_url';

-- 2. Score alleen verplicht bij beoordelingen via de eigen pagina
alter table public.customer_reviews alter column rating drop not null;
alter table public.customer_reviews
  add constraint customer_reviews_rating_required
  check (source <> 'portal' or rating is not null);

-- 3. Publieke view
create or replace view public.published_reviews as
select
  r.id,
  r.rating,
  coalesce(nullif(r.quote, ''), r.text_positive) as text,
  r.author_name,
  r.author_role,
  r.company,
  r.source,
  r.tags,
  r.created_at,
  coalesce(p.attribution ->> 'entry_path', '') as entry_path,
  coalesce(
    (
      select array_agg(distinct i.block_id)
        from public.program_request_items i
       where i.request_id = r.request_id
         and i.block_id is not null
         and i.status <> 'cancelled'
    ),
    '{}'::text[]
  ) as block_ids
from public.customer_reviews r
left join public.program_requests p on p.id = r.request_id
where r.status = 'published';

grant select on public.published_reviews to anon, authenticated, service_role;

-- 4. Bestaande citaten
insert into public.customer_reviews
  (rating, text_positive, author_name, author_role, company, consent_publish, consent_reference, consent_version, status, source)
select v.*
from (
  values
    (
      null::smallint,
      $q$Op het oostelijke buureiland circuleren nog weleens verhalen over 'die Vlielanders' of - erger - 'Vliebiza', maar met Erwin Soolsma en kornuiten van Bureau Vlieland was ik het snel eens over de organisatie van een stoer zakelijk event op de eilanden. Snelle ribs, parachutespringen op de Vliehors en picknicken tussen de tanks - waar kan dat nou anders dan bij ons op de Wadden? Ja, zelfs de Chablis en de oesters waren uitstekend.$q$,
      'Jort Kelder', 'journalist en presentator', '', true, false, 'legacy', 'published', 'legacy'
    ),
    (
      null::smallint,
      $q$Na 6 maanden in het geheim samen een planning maken, dingen regelen en zorgen maken over het weer, was het dan eindelijk zo ver... Vanaf het moment dat wij op onze boot zaten, klaar om richting Vlieland te varen was daar het moment aangebroken om alles los te laten want deze jongens hadden het allemaal onder controle! Alles liep perfect, geweldige hotels, activiteiten en feestavond! Hartelijk dank Bureau Vlieland, wij hebben genoten!$q$,
      'Ilona Norbart', '', 'Districon Group', true, false, 'legacy', 'published', 'legacy'
    ),
    (
      null::smallint,
      $q$Vanaf de allereerste bespreking om invulling te geven aan een culinair, sportief en avontuurlijk weekend op Vlieland, tot en met het afscheid bij de terminal 2 dagen later in Harlingen, heeft het team van Bureau Vlieland dit weekend tot in detail onvergetelijk gemaakt voor een ieder!$q$,
      'Peter-Paul van de Kar', '', 'Tradekar International BV', true, false, 'legacy', 'published', 'legacy'
    ),
    (
      null::smallint,
      $q$Erwin van Bureau Vlieland heeft een top arrangement voor ons in elkaar gezet. Erg plezierig contact, goede begeleiding en heel ontspannen dag gehad op Vlieland. Aanrader voor groepen die een leuke dag willen hebben met een super sfeertje. Lunch in de natuur, BBQ op strand, rib boot tocht, activiteit op strand en ook lekker een terrasje pakken! Voor herhaling vatbaar zou ik zegge$q$,
      'Rients', '', 'Raethuis Accountants Heerenveen', true, false, 'legacy', 'published', 'legacy'
    )
) as v(rating, text_positive, author_name, author_role, company, consent_publish, consent_reference, consent_version, status, source)
where not exists (select 1 from public.customer_reviews where source = 'legacy');
