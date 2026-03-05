

## Plan: Mailjet Parse API — Volledige implementatie

### Overzicht

Drie onderdelen: (1) consistente afzenderadressen, (2) dynamische Reply-To headers, (3) inbound-email webhook.

---

### Deel 1: Consistente afzenderadressen

**Probleem:** `update-customer-program/index.ts` gebruikt op ~7 plekken `noreply@bureauvlieland.nl` in plaats van de gestandaardiseerde `SENDER_EMAIL` constante. Alle andere functies gebruiken al `hallo@bureauvlieland.nl` (direct of via `SENDER_EMAIL`).

**Wijziging:**

| Bestand | Actie |
|---|---|
| `supabase/functions/update-customer-program/index.ts` | Importeer `SENDER_EMAIL, SENDER_NAME` uit `_shared/email-templates.ts`. Vervang alle 7 hardcoded `noreply@bureauvlieland.nl` door `SENDER_EMAIL` |

---

### Deel 2: Dynamische Reply-To headers

**Doel:** Elke uitgaande projectgerelateerde e-mail krijgt een `ReplyTo` header met het projectreferentienummer, zodat antwoorden automatisch gekoppeld kunnen worden.

**Wijziging in `_shared/email-templates.ts`:**
- Nieuwe helper functie `buildReplyTo(referenceNumber: string)` die retourneert: `{ Email: "reply+BV-2503-0012@bureauvlieland.nl", Name: "Bureau Vlieland" }`

**Wijzigingen in edge functions** — overal waar een `request_id` of `reference_number` beschikbaar is, `ReplyTo` toevoegen aan het Mailjet message object:

| Bestand | Context |
|---|---|
| `send-project-email/index.ts` | Admin stuurt mail — referentienummer opzoeken via `requestId` |
| `send-quote-offer/index.ts` | Offerte naar klant |
| `approve-quote-item/index.ts` | Activiteit naar partner |
| `update-customer-program/index.ts` | Diverse partner/klant mails |
| `notify-accommodation-quote/index.ts` | Offerte notificatie naar klant |
| `select-accommodation-quote/index.ts` | Selectie mails |
| `send-accommodation-quote-request/index.ts` | Offerteverzoek naar partners |
| `cancel-program-request/index.ts` | Annulering mails |
| `send-program-request/index.ts` | Bevestiging naar klant |
| `process-completed-items/index.ts` | Proforma notificaties |
| `check-pending-items/index.ts` | Expired quote notificaties |
| `resend-email/index.ts` | Hergestuurde mails |

Functies zonder projectkoppeling (bijv. `invite-partner`, `notify-new-chat`, `send-quote-request`) krijgen geen Reply-To.

---

### Deel 3: Nieuwe edge function `inbound-email`

**Bestand:** `supabase/functions/inbound-email/index.ts`

**Config:** `verify_jwt = false` in `supabase/config.toml` (publiek webhook endpoint)

**Logica:**
1. Ontvang POST van Mailjet Parse API (multipart/form-data of JSON)
2. Extract `To`-adres → parse referentienummer uit `reply+BV-XXXX-XXXX@...`
3. Zoek project op via `program_requests.reference_number` (of `accommodation_requests.reference_number` voor LOG-prefixes)
4. Sla op in `project_communications`:
   - `communication_type: 'email_in'`
   - `direction: 'inbound'`
   - `contact_email` / `contact_name` uit `From`
   - `subject` en `content` (HTML gestript naar tekst)
5. Maak admin todo aan: *"Nieuw antwoord van [naam] op [referentie]"*
6. Return `200 OK`

**Beveiliging:**
- HTML sanitatie op content
- Maximale body size check
- Geen JWT vereist (Mailjet webhook)

---

### Deel 4: Admin UI

| Bestand | Wijziging |
|---|---|
| `src/components/admin/ProjectCommunicationsCard.tsx` | Inbound e-mails visueel markeren met "Inkomend" badge en ander icoon |

---

### DNS-configuratie (handmatig, eenmalig)

Je moet in Mailjet dashboard:
1. Parse API activeren
2. Webhook URL instellen: `https://blhspuifehausilnzwio.supabase.co/functions/v1/inbound-email`
3. Route configureren voor `reply+*@bureauvlieland.nl` (of via een subdomein `reply.bureauvlieland.nl` met apart MX-record)

---

### Samenvatting wijzigingen

| Type | Aantal bestanden |
|---|---|
| Nieuw | 1 (`inbound-email/index.ts`) |
| Gewijzigd | ~14 edge functions + 1 shared + 1 UI component + config.toml |

