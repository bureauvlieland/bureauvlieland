# Aantalwijziging bij een gekozen logiesofferte

> Aanleiding: BV-2608-0002 (oktober 2026). Het aantal personen ging van 10 naar 8 nadat de klant de offerte van een logiespartner had gekozen. De partner kreeg een mail met "pas indien nodig je offerte aan", maar kon bij status `selected` niets aanpassen. De enige route was de volledige reset naar `pending`, met een nieuwe offerte en een nieuwe keuze door de klant.

## Twee routes

| | Lichte route (nieuw) | Reset-route (bestaand) |
|---|---|---|
| Wanneer | Alleen het aantal gasten verandert, zelfde datums en accommodatie | Grote wijziging: andere datums, ander kamertype, offerte klopt niet meer |
| Partner | Bevestigt het nieuwe aantal en het bijbehorende totaal in het partnerportaal ("Nieuw aantal bevestigen") | Dient een nieuwe offerte in |
| Offertestatus | Blijft `selected` | Terug naar `pending` met `reset_reason` |
| Bureau | Beoordeelt het voorstel (werkbanktaak `quote_headcount_review`) | Beoordeelt en stuurt door (`quote_review`) |
| Klant | Krijgt na goedkeuring een mail met het nieuwe totaal; hoeft niets te doen | Kiest opnieuw en tekent opnieuw |
| Waar | Partnerportaal, logiesdetail in de admin | `AdminAccommodationDetail`, "Aantal gasten wijzigen" |

## Gegevens op `accommodation_quotes`

| Kolom | Betekenis |
|---|---|
| `priced_for_guests` | Aantal gasten waarvoor `price_total` geldt. Gezet bij indienen (trigger `set_priced_for_guests_on_submit`) en bij goedkeuring. Wijkt dit af van `accommodation_requests.number_of_guests`, dan is een bevestiging nodig. |
| `headcount_change_requested_at` | Wanneer de partner is gevraagd te bevestigen (`notify-headcount-change-bulk`). Startpunt voor de herinnering. |
| `headcount_proposal` | Het voorstel van de partner: `price_total`, `guests`, `previous_price_total`, `previous_guests`, `room_configuration`, `note`, `proposed_at`. De prijs op de offerte verandert pas na goedkeuring. |
| `headcount_confirmed_at` | Laatste goedkeuring door het bureau. |

De regels staan op één plek: `src/lib/accommodationHeadcount.ts` (Deno-kopie in `supabase/functions/_shared/`). De kolommen zijn voor `authenticated` en `anon` alleen leesbaar; alle schrijfacties lopen via edge functions.

## Stappen

1. **Aantal wijzigen** (admin, "Evenement details bewerken"): `number_of_people` en `number_of_guests` worden bijgewerkt, er komt een historieregel `people_changed`, en `NotifyHeadcountChangeDialog` biedt aan wie te mailen.
2. **Partner vragen** (`notify-headcount-change-bulk`): de gekozen logiespartner krijgt de mail "Nieuw aantal gasten bevestigen" met een knop naar `/partner/logies/:id?actie=aantal`; `headcount_change_requested_at` wordt gezet. In de admin kan dit ook los via "Bevestiging nieuw aantal vragen" op de logiesdetailpagina.
3. **Partner bevestigt** (`confirm-accommodation-headcount`): totaal, optioneel kamerindeling en toelichting komen in `headcount_proposal`. Werkbanktaak `quote_headcount_review`, historieregel `accommodation_headcount_confirmed`, bureau-alert `lodging_headcount_confirmed_bureau`.
4. **Bureau beoordeelt** (`approve-accommodation-headcount`):
   - *Goedkeuren*: oude waarden naar `accommodation_quote_history`, nieuw `price_total` en `price_per_person_per_night`, `priced_for_guests` bijgewerkt, `commission_amount` herberekend met de formule van `select-accommodation-quote` zolang de commissie `pending` is en er geen factuur is, taak gesloten, klantmail `accommodation_headcount_confirmed_customer` en partnermail `accommodation_headcount_confirmed_partner`.
   - *Afwijzen*: voorstel vervalt, taak gesloten met reden, partnermail `accommodation_headcount_rejected_partner` met de reden en de knop om opnieuw te bevestigen.
5. **Herinnering** (`check-pending-items`, controle 2b): na `reminder_days_partner_quote` dagen zonder voorstel een taak `quote_headcount_pending_partner` en een mail `reminder_headcount_pending` aan de partner. Zelfde snooze- en contactuitzonderingen als de andere herinneringen.

## Geld

- De bureaufactuur leest `price_total` live zolang er geen factuur is geregistreerd. Is er al een bureaufactuur, dan waarschuwt de admin bij het goedkeuren; die factuur verandert niet mee.
- `commission_amount` wordt bij goedkeuring herberekend; de commissiewerklijst rekent sowieso live uit `price_total`.
- De inkoopfactuurcontrole vergelijkt live met `price_total`, dus na goedkeuring geldt het nieuwe totaal als verwachting.

## Bijvangst

`notify-headcount-change-bulk`, `notify-partner-headcount-change` en `resend-customer-link` gebruikten een niet gedeclareerde variabele voor de Mailjet MessageID. De mail ging daardoor wel weg, maar het loggen gaf een `ReferenceError` en de function meldde de verzending als mislukt (de admin zag "0 mails verstuurd"). Dat is hersteld; de eerste function gebruikt nu de centrale `sendMailjet`-helper.
