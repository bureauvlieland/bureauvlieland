## Doel
1. **(B)** Voortaan: wanneer een admin een programma-onderdeel verwijdert dat al naar de partner was verstuurd, krijgt die partner automatisch een korte annulering-mail.
2. **(A)** Met terugwerkende kracht: voor BV-2602-0004 alsnog een nette annulering-mail sturen aan de 4 betrokken activiteitenpartners.

---

## Deel B — Workflow aanpassen

### Nieuwe edge function: `notify-partner-item-deletion`
Service-role functie die één of meer `item_id`s ontvangt, zelf bepaalt wie gemaild moet worden, mail verstuurt (gegroepeerd per partner) en daarna de items hard verwijdert.

Logica per item:
- Skip mail wanneer een van deze waar is:
  - `block_type = 'self_arranged'` of `'bureau'`
  - `provider_id = 'bureau'`
  - `provider_id IS NULL`
  - `skip_partner_notification = true` **én** nooit naar partner verstuurd (`customer_approved_at IS NULL` én `status = 'pending'`)
- Anders: groepeer per `provider_id`, render `cancellation_partner_project`-template (al beschikbaar) met variant-tekst "Een onderdeel van aanvraag … is komen te vervallen", log naar `email_log` (`email_type = 'partner_item_cancellation'`) en `project_communications`.

Daarna: `DELETE` van alle item-ids (ongeacht of er gemaild is) met service role.

### Frontend
In `src/pages/admin/AdminRequestDetail.tsx` de twee directe `supabase.from("program_request_items").delete()` calls (regel ~1881 voor activiteit-verwijderen en ~2161 voor "overige kosten") vervangen door een aanroep van de nieuwe edge function. Voor "overige kosten" stuurt de function gewoon nooit een mail (block_type bureau / provider bureau).

Bestaande directe deletes elders in admin-componenten worden NIET aangepast (alleen de zichtbare verwijder-knoppen op de programma-pagina).

---

## Deel A — Eenmalige actie voor BV-2602-0004

De 4 items zijn al hard verwijderd, dus de edge function kan de partners niet meer reconstrueren uit `program_request_items`. We doen het via een eenmalige database-actie + handmatige mail-trigger:

1. Ophalen van de 4 partners op basis van `email_log` van 4 mei 15:34 (related_partner_id = `vliehors-expres`, `vlieland-outdoor-center`, `zuiver`, `zeehonden`) en hun `contact_email`/`email`.
2. Per partner een mail sturen via Mailjet met dezelfde template als in B, met de tekst dat het activiteitenprogramma van Jeannette van Spil (BV-2602-0004) is komen te vervallen. (Het logies-stuk loopt door — dit is alleen voor de activiteitenpartners.)
3. Loggen naar `email_log` (type `partner_item_cancellation`, related_request_id = `50197350-…`) en `project_communications`.

Dit gebeurt via een eenmalige aanroep van een kleine helper-edge-function `backfill-cancellation-bv-2602-0004` (of inline via de nieuwe function met een `legacy_partners` parameter — eenvoudiger). Na uitvoering wordt het script verwijderd.

---

## Wat NIET verandert
- Het logies-deel (`accommodation_quotes`) blijft ongemoeid; commissiefactuur kan straks normaal opgesteld worden.
- De `cancel-program-request` flow voor het annuleren van een hele aanvraag blijft bestaan en ongewijzigd.
- Bestaande email-templates worden hergebruikt; geen nieuwe template nodig.

## Bestanden
- `supabase/functions/notify-partner-item-deletion/index.ts` — nieuw
- `src/pages/admin/AdminRequestDetail.tsx` — twee delete-handlers herbedraden
- Eenmalige run via `supabase--curl_edge_functions` voor BV-2602-0004 met `legacy_partners`-payload

## Open vraag
- Akkoord dat de mail aan de 4 partners van BV-2602-0004 nu (op 6 mei) verstuurd wordt vanuit `bureauvlieland.nl` — of wil je 'm eerst zelf zien? Ik kan ook eerst een preview van de tekst tonen voordat ik 'm verstuur.
