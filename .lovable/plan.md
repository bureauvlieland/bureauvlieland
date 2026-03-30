

## Plan: Partnermailing-functie vanuit de admin

### Wat we bouwen
Een admin-functionaliteit waarmee je een mailing kunt versturen naar alle (of geselecteerde) partners via de bestaande Mailjet-integratie. De mailing wordt opgesteld in de admin, met preview, en vervolgens per partner verstuurd met rate-limiting.

### Deel 1: Edge Function `send-partner-mailing`

Nieuwe edge function die:
- Admin-check doet (zelfde patroon als `bulk-invite-partners`)
- Een onderwerp, HTML-body en optionele partnerIds ontvangt
- Als geen partnerIds: stuurt naar **alle actieve partners** met `auth_user_id`
- Per partner `{{partner_name}}` vervangt in de body
- Rate-limiting: 200ms delay tussen mails (Mailjet limiet)
- Preview-mode: in lovable.app omgeving alles naar `erwin@bureauvlieland.nl`
- Elke mail logt in `email_log` met type `partner_mailing`
- Retourneert resultaten per partner (success/fail)

### Deel 2: Admin UI — Mailing pagina of dialog

**Nieuwe component:** `src/components/admin/SendPartnerMailingDialog.tsx`
- Full-screen sheet/dialog met:
  - **Onderwerp** — tekst-input
  - **Body** — HTML textarea met code/preview tabs (zelfde patroon als `EmailTemplateSheet`)
  - **Ontvanger-selectie** — alle actieve partners of handmatige selectie
  - **Partner-telling** — "Deze mailing gaat naar X partners"
  - **Preview** — toont gerenderde HTML met voorbeeldwaarden
  - **Verzend-knop** met bevestigingsdialoog
  - **Voortgang** — progress bar + resultaten na afloop

**Integratie:** Knop toevoegen op `AdminPartners.tsx` (naast "Partner toevoegen"):
- "Mailing versturen" knop met `Mail` icoon
- Opent de mailing-dialog

### Deel 3: Optioneel — selectie van partners

De bestaande checkbox-selectie op de partnerpagina hergebruiken:
- Als partners geselecteerd zijn → mailing gaat alleen naar die selectie
- Als geen selectie → mailing gaat naar alle actieve partners met account

### Bestanden

| Bestand | Actie |
|---|---|
| `supabase/functions/send-partner-mailing/index.ts` | Nieuw — edge function |
| `src/components/admin/SendPartnerMailingDialog.tsx` | Nieuw — UI component |
| `src/pages/admin/AdminPartners.tsx` | Knop toevoegen |

