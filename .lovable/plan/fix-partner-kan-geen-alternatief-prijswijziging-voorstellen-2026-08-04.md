# Fix: partner kan geen alternatief/prijswijziging voorstellen

## Wat er gebeurt

Als een partner (Zeehondentochten Vlieland) een alternatief voorstel met een andere prijs of tijd instuurt, faalt het opslaan met de melding `program_request_items_quote_status_check`.

## Oorzaak (gecontroleerd)

De functie achter het partnerportaal zet bij een alternatief voorstel de interne offertestatus van het onderdeel op `wacht_op_klant`. Die waarde bestaat alleen als *weergavestatus* in de interface — de database staat voor dit veld uitsluitend `concept`, `offerte_verstuurd`, `in_afstemming`, `bevestigd` of `optioneel` toe. Daardoor wordt elke alternatief-inzending door de database geweigerd en gaat het voorstel van de partner verloren.

## Wat we aanpassen

- In `update-partner-item-status`: bij een alternatief voorstel de interne status op `in_afstemming` zetten in plaats van de ongeldige waarde. Het effect voor de gebruiker blijft hetzelfde: klantgoedkeuring wordt gewist, dus het onderdeel toont weer "Akkoord nodig" bij klant, admin en partner (de weergavestatus wordt berekend, niet opgeslagen).
- Functie opnieuw uitrollen en controleren dat een alternatief met afwijkende prijs (€ 390) en tijd (13:30) doorkomt.

## Extra zekerheid

- Een kleine regressietest die vastlegt dat alleen de vijf toegestane waarden naar `item_quote_status` geschreven mogen worden, plus een source-check dat geen enkele edge function of frontend een weergavestatus (zoals `wacht_op_klant`) naar dat veld schrijft.
- Controle of dit ook elders in het partnerportaal voorkomt (alternatief, niet-beschikbaar, prijsbevestiging).

## Technisch

- `supabase/functions/update-partner-item-status/index.ts` regel ~336: `item_quote_status = "wacht_op_klant"` → `"in_afstemming"`.
- Nieuwe test in `src/lib/__tests__/` met de toegestane set uit de check-constraint als bron van waarheid.
- Geen migratie nodig; de constraint is correct en blijft ongewijzigd.
