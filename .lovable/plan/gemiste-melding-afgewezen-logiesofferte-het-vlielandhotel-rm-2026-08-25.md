# Gemiste melding: afgewezen logiesofferte (Het Vlielandhotel / RMD Trainingen)

## Antwoord op je vraag: ja, dat klopt — en het is een bug

**Feiten uit de database:**
- Project BV-2608-0002 (RMD Trainingen), logiesaanvraag LOG-2608-0001.
- Het Vlielandhotel heeft de offerteaanvraag afgewezen op **19-08-2026 om 08:48** (quote `fbdb4a73…`, status `declined`).
- Er is **geen** werkbanktaak, **geen** historie-entry en **geen** e-mail aangemaakt. De enige sporen zijn klant-acties op 18-08.

**Twee oorzaken (beide geverifieerd in code + RLS):**

1. **Twee verschillende afwijs-routes.** De partner kan een logiesaanvraag afwijzen via de projectpagina (`PartnerProject.tsx`) én via het logiesportaal (`PartnerAccommodation.tsx`). De projectpagina-route doet alleen een kale status-update — geen todo, geen historie, niets. Deze afwijzing ging via die route (anders hadden todo + historie er gestaan, of in elk geval was dat de bedoeling).
2. **Zelfs de "goede" route faalt stilletjes.** `PartnerAccommodation.tsx` probeert client-side een `admin_todos`-taak en `program_request_history`-entry aan te maken, maar de RLS-policies staan schrijven alleen toe aan admins. Als partner lopen die inserts op een permission error en worden ze met `.then(() => {})` genegeerd. Er komt dus **nooit** een melding, via welke route ook.

Bij een *ingediende* offerte werkt het wél, omdat die via de edge function `create-quote-review-todo` gaat (service role, server-side). Voor afwijzingen ontbreekt zo'n functie.

## Wat we bouwen

1. **Nieuwe edge function `decline-accommodation-quote`** (naar model van `create-quote-review-todo`, met service role):
   - Zet de offerte op `declined` (met reden, eventuele alternatieve datums, `submitted_at`).
   - Maakt een werkbanktaak aan (`accommodation_quote_declined` of `accommodation_alternative_dates`, prioriteit hoog) zodat de afwijzing in de Werkbank-inbox verschijnt — consistent met hoe nieuwe offertes gemeld worden.
   - Schrijft een entry in `program_request_history` (activiteitenfeed) en `project_communications` (dossier-tijdlijn).
   - Sluit de openstaande `quote_pending_partner`-taak voor deze offerte af.
2. **Beide partner-routes gelijktrekken**: `PartnerProject.tsx` en `PartnerAccommodation.tsx` roepen de nieuwe edge function aan in plaats van zelf te updaten/inserten. De faalbare fire-and-forget inserts verdwijnen uit de client.
3. **Eenmalig herstel voor dit geval**: de gemiste werkbanktaak + historie-entry voor LOG-2608-0001 (Het Vlielandhotel, afgewezen 19-08) alsnog aanmaken, zodat het dossier klopt.
4. **Test**: unit-test of edge-function-test die vastlegt dat een afwijzing altijd een admin-todo oplevert (beide varianten: gewone afwijzing en alternatieve datums).

## Technisch

- Nieuw: `supabase/functions/decline-accommodation-quote/index.ts` (input: `quoteId`, `declineReason`, optioneel `proposedArrival`/`proposedDeparture`; beveiligd zoals `create-quote-review-todo`).
- Wijzigen: `src/pages/PartnerProject.tsx` (`handleQuoteDecline` → invoke edge function), `src/pages/PartnerAccommodation.tsx` (`handleQuoteDecline` → zelfde invoke; verwijder directe updates/inserts).
- Eenmalig: SQL-insert van todo + history voor quote `fbdb4a73-15ad-47aa-85fc-af104c997cdd`.
- Geen nieuwe e-mail: bewust consistent met de bestaande designkeuze ("Bureau-mail bij nieuwe offerte is geschrapt — admin ziet de todo direct in dashboard"). De werkbank-badge is het meldingskanaal.
