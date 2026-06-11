## Probleem

In `CheckoutContactForm.tsx` checken we nu of er in de **laatste 24 uur** al een aanvraag is op hetzelfde e-mailadres. Daarna is die check uit en kan dezelfde klant moeiteloos een tweede (derde, vierde…) parallelle aanvraag indienen. In de sales-fase betekent dat: dubbele dossiers, verwarring over welke offerte "de echte" is, en partners die meerdere keren benaderd worden.

De huidige dialog biedt ook geen weg terug — alleen "Annuleren" of "Nieuwe aanvraag versturen". De klant wéét niet meer hoe hij bij zijn eerdere programma komt.

## Voorgestelde oplossing

### 1. Dedup-venster: actieve aanvragen, onbeperkt in tijd

Vervang de harde 24-uurs grens door een check op **alle actieve aanvragen** van hetzelfde e-mailadres — geen tijdslimiet. "Actief" = `status != 'cancelled'` én `completion_status` niet `fully_invoiced`. Zolang er ergens een lopend dossier is op dat e-mailadres, krijgt de klant de dialog te zien.

De bestaande 5-minuten hard-block (dubbele klik / refresh-resubmit) blijft staan zoals hij is.

### 2. Dialog ombouwen naar "ga verder met bestaande aanvraag"

In plaats van de huidige tekst + knop "Nieuwe aanvraag versturen", krijgt de dialog drie acties:

- **Primair:** "Stuur mij de link naar mijn lopende aanvraag" → roept nieuwe edge function `resend-customer-link` aan die het bestaande `customer_token` per mail (Mailjet) verstuurt naar `customer_email`. Geen nieuw dossier.
- **Secundair:** "Bel ons (0562 700 208)" — telefoon-link.
- **Tertiair (klein, onderaan):** "Dit is écht een nieuwe aanvraag voor een andere groep/datum" → bestaande `executeSubmit`-flow.

Copy maakt duidelijk: uw eerdere wensen staan klaar, wij sturen u de link zodat u kunt aanpassen of aanvullen — geen nieuw traject opstarten. Formele 'u'-toon conform stijl.

### Wat we NIET doen

- Geen schema-wijziging aan `program_requests`.
- Geen samenvoegen/migreren van carts (klant zit in lokale `CartContext`; bestaand dossier kan al door bureau bewerkt zijn).
- Geen auto-cancel van de nieuwe aanvraag als de klant tóch doorklikt — admin behoudt overzicht via Werkbank.

## Technisch

**Frontend** — `src/components/configurator/CheckoutContactForm.tsx`
- `checkForDuplicateAndSubmit`: vervang 24u-window door query op actieve `program_requests` (filter: `customer_email = …`, `status != 'cancelled'`, `completion_status` niet `fully_invoiced`). Selecteer `id, reference_number, customer_token, created_at, quote_status`. Order op `created_at desc`, limit 1.
- State uitbreiden met `existingRequestId`, `existingToken`, `existingQuoteStatus`, `existingCreatedAt`.
- `AlertDialog` herontwerpen met drie acties (zie boven). Tekst onderscheidt "uw aanvraag wordt verwerkt" (quote_status concept / in_afstemming) vs "uw offerte staat klaar" (offerte_verstuurd / akkoord_ontvangen).
- Nieuwe handler `handleResendLink()` → `supabase.functions.invoke("resend-customer-link", { body: { request_id } })`, daarna toast + sluit dialog. Bij fout: fallback-bericht met telefoonnummer.

**Backend** — nieuwe edge function `supabase/functions/resend-customer-link/index.ts`
- Public (geen JWT), accepteert `{ request_id: string }` (Zod-validatie).
- Service role: haalt `program_requests` op (customer_email, customer_name, customer_token, reference_number).
- Verstuurt via bestaande Mailjet-helper een korte mail: "Uw aanvraag {reference_number} staat klaar" met URL `${PUBLIC_SITE_URL}/mijn-programma/${customer_token}` (URL-resolution conform `mem://infrastructure/edge-function-url-resolution`).
- Logt naar `email_log` met `template_name: "customer_link_resend"` en `metadata.actor: "customer_self_service"` (conform email-logging-contract).
- Logt naar `program_request_history` (`action: "link_resent"`, `actor: "customer"`).
- Rate-limit: weiger als laatste `customer_link_resend` op deze `request_id` < 5 min geleden was (check `email_log`).

**Documentatie** — `mem://features/configurator-deduplication-logic.md` bijwerken: venster verruimd naar "alle actieve aanvragen, onbeperkt"; dialog stuurt klant terug naar bestaand dossier via resend-link.