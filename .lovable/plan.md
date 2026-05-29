## Doel

WhatsApp gesprekken (inkomend én uitgaand) afhandelen vanuit de bestaande **Berichten** in admin (`/admin/chat`), gekoppeld aan partners en projecten waar mogelijk. Twilio levert de WhatsApp‑transport.

## Aanpak in het kort

We hergebruiken de **bestaande `chat_conversations` / `chat_messages`** tabellen (waar nu Klantportal‑ en Partnerportal‑chats inkomen). We voegen een nieuwe bron `whatsapp` toe en een aparte `whatsapp_contacts` tabel zodat één telefoonnummer hergebruikt kan worden over meerdere gesprekken. Twee edge functions verzorgen de Twilio‑integratie (`whatsapp-webhook` inkomend, `whatsapp-send` uitgaand). De Twilio‑credentials worden als nieuwe API Key + Secret aangemaakt (zoals jij koos) en als secrets opgeslagen.

## Wat er gebouwd wordt

### 1. Database

- Nieuwe tabel `public.whatsapp_contacts`
  - velden: `phone_number` (E.164, uniek), `whatsapp_name`, `partner_id` (nullable), `request_id` (laatst gekoppeld project, nullable), `notes`
  - RLS: alleen admins
- `chat_conversations`
  - source‑check uitgebreid met `'whatsapp'`
  - kolommen toegevoegd: `whatsapp_contact_id`, `phone_number` (denormalized voor snelle filter)
- `chat_messages`
  - sender_type check uitgebreid met `'customer'` (= WhatsApp inbound). `admin` bestaat al voor uitgaande berichten.
  - kolom `twilio_message_sid` (voor delivery tracking & dedupe)

### 2. Secrets

Je voegt aan via de Twilio Console:
- `TWILIO_ACCOUNT_SID` (AC…) – van het account
- `TWILIO_API_KEY_SID` (SK…) – nieuwe API Key voor dit project
- `TWILIO_API_KEY_SECRET` – bijbehorend secret
- `TWILIO_WHATSAPP_NUMBER` – jouw business‑nummer in formaat `whatsapp:+316…`
- `TWILIO_AUTH_TOKEN` – nodig voor signature‑validatie van inkomende webhooks

### 3. Edge functions

**`whatsapp-webhook`** (verify_jwt = false, public)
- Twilio Console webhook‑URL wijst hier naartoe (POST, form‑urlencoded)
- Valideert `X-Twilio-Signature` met `TWILIO_AUTH_TOKEN`
- Zoekt/maakt `whatsapp_contacts` op `From`
- **Auto‑koppeling op telefoonnummer:**
  1. Match in `partners.phone` → vul `source_partner_id` op de conversatie
  2. Match in `program_requests.customer_phone` (open / niet‑afgerond) → vul `request_id`
  3. Geen match → conversatie blijft 'ongekoppeld'
- Hergebruikt open conversatie van dit nummer of maakt een nieuwe (`source='whatsapp'`)
- Schrijft `chat_messages` met `sender_type='customer'`
- Geeft lege TwiML terug (geen auto‑reply)

**`whatsapp-send`** (admin‑only)
- Valideert JWT + admin‑rol
- Body: `{ conversation_id, content }` (Zod)
- Stuurt via Twilio REST API (`/Messages.json`) met **API Key auth** (`SK…:secret` Basic) zodat de key per project intrekbaar is
- Slaat bericht op met `sender_type='admin'` + `twilio_message_sid`

`supabase/config.toml`: `verify_jwt = false` voor `whatsapp-webhook` (Twilio kan geen JWT meesturen). `whatsapp-send` blijft default (JWT vereist).

### 4. UI – integratie in bestaande Berichten

**`AdminChat` (`/admin/chat`)**
- Nieuwe filter‑tabs: *Alle / Klant / Partner / WhatsApp* (gebruikt al `useAdminChat` met `statusFilter`)
- Conversatie‑item krijgt kanaal‑icoon: 💬 chat / 🟢 WhatsApp
- Detail‑header bij WhatsApp toont:
  - Telefoonnummer + WhatsApp profielnaam
  - Badge "Gekoppeld aan: <partner>" of "<project>" – klikbaar
  - Knop **"Koppel aan partner/project"** als 'ongekoppeld'
- Berichten‑weergave werkt al; alleen het verstuur‑pad gaat via `whatsapp-send` als `source='whatsapp'`
- Sidebar‑badge **WhatsApp** met unread count

**Partnerdetail** (`/admin/partners/:id`) en **Projectdetail** (`/admin/projecten/:id`)
- Knop **"Stuur WhatsApp"** rechtsboven (zichtbaar als telefoonnummer bekend is)
- Opent dialog: nummer (prefilled, editable), bericht, optioneel een template; bij verzenden
  - Bestaande open WhatsApp‑conversatie hergebruiken óf nieuwe aanmaken (gekoppeld)
  - Redirect/Link naar `/admin/chat?conversation=<id>` na succes
- Let op het **WhatsApp 24‑uurs sessievenster**: als het laatste inbound bericht ouder is dan 24u, moet je een goedgekeurde template gebruiken. We tonen daarvoor een waarschuwing in de dialog en blokkeren vrije tekst tot een template gekozen is. (Templates beheren we niet in deze fase; dropdown leest uit `app_settings.whatsapp_templates` JSON met `name` + `language`.)

### 5. Privacy & toon

- Conform memory `mem://style/formal-communication-tone`: standaard suggesties richting klant in **u‑vorm**, richting partner **je‑vorm**.
- Conform `mem://business/partner-communication-privacy-rules`: bij WhatsApp naar partner geen klant‑PII tonen in de UI‑suggesties.

### 6. Logging

Inkomend en uitgaand worden in `chat_messages` opgeslagen (single source of truth). Geen extra `email_log` entries – WhatsApp is een eigen kanaal en hoort niet in de email‑logging contract.

## Wat jij in de Twilio Console moet doen

1. Maak een **API Key + Secret** aan (Account → API keys & tokens → Create API key, type *Main* of *Standard*) – dit zijn de waardes voor `TWILIO_API_KEY_SID` / `TWILIO_API_KEY_SECRET`.
2. Bij **Messaging → WhatsApp Senders** (jouw business‑nummer) onder *Sandbox/Sender Configuration*:
   - **When a message comes in**: `POST https://blhspuifehausilnzwio.supabase.co/functions/v1/whatsapp-webhook`
3. Schakel in productie **SMS Pumping Protection** en **Geo Permissions** in (zie Twilio docs). 

## Out of scope (voor latere fase)

- Inkomende media (foto/audio) – wordt nu als placeholder tekst opgeslagen
- WhatsApp delivery/read receipts (status‑webhook)
- Per‑gebruiker WhatsApp (Twilio is altijd jouw business‑nummer)
- Templates aanmaken / Meta‑review flow (gebeurt buiten Lovable, in Twilio Console)

## Volgorde van implementatie

1. Migration (whatsapp_contacts + chat_conversations / chat_messages uitbreiden)
2. Secrets toevoegen
3. `whatsapp-webhook` + `whatsapp-send` + config.toml
4. AdminChat: kanaal‑filter + WhatsApp‑headerinfo + uitgaand pad naar `whatsapp-send`
5. "Stuur WhatsApp" dialog + knoppen op partner‑ en projectdetail
6. Memory bijwerken (nieuwe core rule: WhatsApp via Twilio in AdminChat, auto‑match op telefoonnummer)
