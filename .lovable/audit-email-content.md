# Audit e-mail- en facturatieteksten (mei 2026)

## Afgedwongen regels (bron van waarheid)
- Bureau Vlieland factureert centraal aan de klant (`bureau_central`).
- Partners factureren **nooit** rechtstreeks aan de eindklant.
- Partners factureren ná uitvoering aan Bureau Vlieland via:
  1. Upload/registratie in het **partnerportaal**, óf
  2. PDF naar **inkoop@reply.bureauvlieland.nl** (Mailjet Parse inbox)
- Partner-mails bevatten **geen klant-PII / klantfacturatiegegevens**.
- Aanspreektoon: klant = formeel ("u"), partner = informeel ("je").
- Positionering: lokale specialist / reisagent / boekingskantoor + programma-ontwikkelaar. Geen "regie op het eiland".

## E-mailadressen (canoniek)
| Doel | Adres |
|---|---|
| Algemene afzender / reply | `hallo@bureauvlieland.nl` |
| Project-reply (subaddressing) | `reply+<ref>@reply.bureauvlieland.nl` |
| Partner-facturen (inkoop) | `inkoop@reply.bureauvlieland.nl` |
| Administratie (footer / bedrijfsgegevens) | `administratie@bureauvlieland.nl` |
| Test-rerouting in preview | `erwin@bureauvlieland.nl` |

`facturatie@bureauvlieland.nl` is **uitgefaseerd** — niet meer gebruiken in nieuwe teksten.

## Gecontroleerd / gecorrigeerd
- DB-template `booking_confirmed_partner` — herschreven; klant-facturatiegegevens verwijderd, juiste inkoop-instructie toegevoegd.
- DB-templates met `facturatie@bureauvlieland.nl`-vermeldingen: bulk vervangen naar `inkoop@reply.bureauvlieland.nl` (UPDATE op `email_templates`).
- `supabase/functions/update-customer-program` (fallback body) — klant-facturatieblok verwijderd, inkoop-instructie toegevoegd, gedeployed.
- `supabase/functions/accept-quote-proposal` — facturatie@-adres vervangen, gedeployed.
- `supabase/functions/send-items-to-partners` — facturatie@-adres vervangen, gedeployed.
- `src/pages/PartnerGuides.tsx` — drie passages gecorrigeerd (facturatiemodel, factuur registreren, FAQ).
- `src/components/partner-portal/PartnerAccommodationRequestCard.tsx` — instructie gecorrigeerd.

## Validatie
- `rg "facturatie@bureauvlieland\.nl" src supabase/functions` → geen hits.
- DB-check `body_html ilike '%facturatie@bureauvlieland.nl%'` → 0 rijen.

## Bewuste uitzonderingen
- Oude migration-bestanden (`supabase/migrations/*.sql`) bevatten nog het oude adres in INSERT-statements. Deze worden niet teruggedraaid; de live DB is via UPDATE bijgewerkt. Migraties worden alleen opnieuw uitgevoerd op een verse omgeving — daar moet bij re-seed opnieuw een corrigerende migratie volgen.
