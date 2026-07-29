## Doel

Floating "Uw programma"-knop rechtsonder vervangen door een **pre-sales chat-widget** die aansluit op de bestaande WhatsApp/chat-infrastructuur. Winkelmand-icoon verhuist naar de navigatiebalk. Er komt een aparte **FAQ-pagina**.

## Waarom in-app i.p.v. wa.me

De app heeft al:
- `whatsapp-send` / `whatsapp-webhook` (Twilio) voor uitgaande + inkomende WhatsApp
- `chat-visitor-send` + `chat_conversations` voor anonieme site-chat
- Admin-inbox op `/admin/chat` die beide bronnen (`customer_portal` en `whatsapp`) verzamelt

Een externe `wa.me`-link zou berichten buiten dit dossier plaatsen. Beter: bezoeker chat direct in een floating widget; het bericht landt in dezelfde admin inbox. Wil de bezoeker per se WhatsApp, dan tonen we in dezelfde widget een "Doorgaan via WhatsApp"-knop die dan wél `wa.me/<Twilio-nummer>` opent (met een geprefabriceerd bericht) — best of both.

## Wijzigingen

### 1. Floating pre-sales chat-widget

Nieuw component `src/components/site/PreSalesChatWidget.tsx` (vervangt `GlobalCartDrawer` in `App.tsx`):

- Floating knop rechtsonder: bubbel-icoon (`MessageCircle`) + label "Hulp nodig?".
- Klik → opent een klein popover-paneel met:
  - Korte intro "Stel uw vraag — we reageren snel tijdens kantooruren."
  - Formulier: naam + e-mail + bericht.
  - Verzendknop → `supabase.functions.invoke("chat-visitor-send", …)`.
    - Bezoekers zonder `customer_token` hebben nu geen source-token. Kleine backend-uitbreiding: `chat-visitor-send` accepteert ook `source: "presales"` zonder token, met rate-limiting op IP/e-mail (max 5 berichten per uur). Zie technisch onderdeel.
  - Bevestiging: "Verzonden — we mailen zodra we reageren."
  - Aparte secundaire knop: "Liever WhatsApp?" → opent `wa.me/<TwilioNummer>?text=…` in nieuw tabblad.
  - Link "Bekijk veelgestelde vragen" → `/veelgestelde-vragen`.
- Zichtbaar op alle publieke pagina's, verborgen op `/admin/*`, `/partner*`, klantportalen (zelfde exclusion-lijst als huidige `GlobalCartDrawer`).
- Analytics-events: `presales_widget_open`, `presales_message_sent`, `presales_whatsapp_click`.

### 2. Backend: `chat-visitor-send` uitbreiden met pre-sales flow

`supabase/functions/chat-visitor-send/index.ts`:

- Nieuwe `source: "presales"` naast `customer_portal`.
- Voor `presales`: geen `sourceToken` verplicht; wel `visitorName` + `visitorEmail` (basisvalidatie) + `content`.
- Rate-limit: max 5 inserts per uur per e-mail én per IP (Deno KV of simpele query op `chat_conversations` + `chat_messages` van laatste 60 min).
- Maakt `chat_conversations` met `source='presales'` (nieuwe waarde toevoegen aan enum via migratie) of hergebruikt bestaande open conversation op e-mail.
- Trigger dezelfde `notify-new-chat` mail zodat kantoor direct notificatie krijgt.
- Migratie: check-constraint / enum op `chat_conversations.source` uitbreiden met `'presales'`; RLS-policies aanpassen zodat admin de nieuwe rijen kan lezen.

### 3. Winkelmand-icoon in de navigatie

`src/components/Navigation.tsx` en `src/components/navigation/MobileNav.tsx`:

- Klein `ShoppingCart`-icoon met badge naast/voor de CTA "Start uw aanvraag".
- Alleen zichtbaar als `useCartSafe()` bestaat en `cartItems.length > 0`.
- Linkt naar `/programma-samenstellen`, gebruikt bestaande `itemJustAdded` pulse.
- Op mobiel als link bovenaan het menu of als los icoon in de header naast het hamburger-menu.

### 4. FAQ-pagina

Nieuwe pagina `src/pages/VeelgesteldeVragen.tsx` op route `/veelgestelde-vragen`:

- 8–12 vragen in shadcn `Accordion`, gegroepeerd (Boeken & wijzigen, Programma & activiteiten, Prijzen & facturatie, Op het eiland, Praktisch).
- CTA-blok onderaan: chat-widget openen + WhatsApp + telefoon + link naar `/contact`.
- SEO: `<title>`, meta description, JSON-LD `FAQPage` schema.
- Toegevoegd aan `public/sitemap.xml` (via `scripts/generate-sitemap.ts`), `Footer` en `MegaDropdown` ("Over ons" of "Contact").

### 5. Opruimen

- `App.tsx`: `<GlobalCartDrawer />` → `<PreSalesChatWidget />`.
- `GlobalCartDrawer.tsx` verwijderen zodra nav-cart werkt (en eventuele tests updaten).

## Technische details

- Widget in Tailwind + shadcn `Popover`; toegankelijk (`aria-label`, focus trap in het paneel, ESC sluit).
- WhatsApp fallback-URL: gebruikt Twilio-nummer uit publieke config (nieuwe `VITE_PUBLIC_WHATSAPP_NUMBER` in `.env`, in E.164 zonder `+`, bijv. `31562700208`). Als je een apart mobiel nummer wilt, geef je dat aan; anders gebruik ik het huidige kantoornummer.
- Rate-limit query op `chat_messages` (join `chat_conversations` op source='presales', filter op visitor_email of ip het laatste uur). IP via `req.headers.get("x-forwarded-for")`.
- Migratie: `ALTER TYPE chat_source ADD VALUE 'presales'` (of tabel-check aanpassen — afhankelijk van huidige schema).
- Tests:
  - `chat-visitor-send` Deno test voor `source='presales'` (happy path + rate-limit).
  - React test voor widget: open/close, submit call, WhatsApp-link href correct.
- FAQ JSON-LD via inline `<script type="application/ld+json">` in de pagina; content is statisch (later via Cloud te editen indien gewenst).

## Open punt

Welk telefoonnummer moet de "Doorgaan via WhatsApp"-knop bellen? Twilio-WhatsApp gebruikt normaliter een specifiek zakelijk nummer — is dat gelijk aan `0562700208`, of is er een mobiel/business-nummer dat aan Twilio hangt? Laat je het leeg, dan gebruik ik `0562700208` als default en zet ik het in één constante zodat je later gemakkelijk kunt aanpassen.