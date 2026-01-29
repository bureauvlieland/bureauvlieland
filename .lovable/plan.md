
# Plan: Offerte-modus voor Maatwerk Programma's

## Samenvatting
Uitbreiding van de bestaande programma-tool met een **Offerte-modus** waarmee Bureau Vlieland maatwerkprogramma's kan samenstellen en aanbieden. Het cruciale verschil met self-service: in Offerte-modus loopt alle communicatie eerst via Bureau Vlieland, er gaan geen automatische aanvragen naar partners, en de klant krijgt een gepresenteerde offerte ter goedkeuring.

---

## 1. Database Uitbreidingen

### 1.1 Nieuwe kolommen op `program_requests`

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| `program_type` | text | `'self_service'` (default) of `'quote'` |
| `quote_status` | text | `'concept'`, `'in_afstemming'`, `'offerte_verstuurd'`, `'akkoord_ontvangen'`, `'definitief_bevestigd'`, `'verlopen'`, `'geannuleerd'` |
| `quote_valid_until` | date | Geldigheidsdatum van de offerte |
| `quote_sent_at` | timestamptz | Wanneer offerte is verstuurd naar klant |
| `quote_sent_by` | uuid | Admin die offerte heeft verstuurd |
| `admin_created_by` | uuid | Admin die programma heeft aangemaakt (alleen voor quote mode) |

### 1.2 Nieuwe kolommen op `program_request_items`

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| `item_quote_status` | text | `'concept'`, `'in_afstemming'`, `'bevestigd'`, `'optioneel'` |
| `admin_price_override` | numeric | Handmatige prijsaanpassing door admin |
| `admin_price_notes` | text | Toelichting bij prijsaanpassing |
| `skip_partner_notification` | boolean | Default `true` in quote mode |

---

## 2. Admin Interface: Nieuw Programma Aanmaken

### 2.1 Nieuwe Admin Page: `/admin/programma-nieuw`

**Stap 1: Modus Selectie**
```
┌─────────────────────────────────────────────────────────────┐
│  Nieuw Programma Aanmaken                                   │
│                                                             │
│  Programmatype:                                             │
│  ○ Self-service (klant start zelf)                         │
│  ● Maatwerk/Offerte (Bureau Vlieland stelt samen)          │
│                                                             │
│  [Volgende →]                                               │
└─────────────────────────────────────────────────────────────┘
```

**Stap 2: Klantgegevens invoeren**
- Naam, email, telefoon, bedrijf
- Aantal personen
- Gewenste datum(s)
- Interne notities

**Stap 3: Bouwstenen toevoegen**
- Hergebruik bestaande `BuildingBlockCard` componenten
- Inline prijs-override per item mogelijk
- Status per bouwsteen: Concept / In afstemming / Bevestigd / Optioneel

**Stap 4: Offerte-instellingen**
- Geldigheidsdatum instellen
- Persoonlijke begeleidende tekst
- Preview van klantweergave

---

## 3. Admin Aanvraag Detail: Quote Mode Uitbreiding

### 3.1 Quote-specifieke Header
```
┌─────────────────────────────────────────────────────────────┐
│  [← Terug]  Bedrijf XYZ                     BV-2601-0042    │
│             Maatwerkofferte                                 │
│                                                             │
│  Status: [In afstemming ▼]  │  Geldig tot: 15 feb 2025     │
│                                                             │
│  [Offerte versturen]  [Klantportaal openen]  [Annuleren]   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Item Status Management (per bouwsteen)
```
┌─────────────────────────────────────────────────────────────┐
│  Speedboot tocht          │  Status: [Bevestigd ▼]         │
│  Rederij Vlieland         │                                 │
│                           │                                 │
│  Oorspronkelijke prijs: €32,50 p.p.                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Aangepaste prijs: € [35,00] incl. BTW               │  │
│  │ Toelichting: [Hogere seizoensprijs + marge]         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Quote Status Workflow (programma-niveau)

| Status | Beschrijving | Volgende acties |
|--------|--------------|-----------------|
| Concept | Initieel aangemaakt | Kan wijzigen, naar "In afstemming" |
| In afstemming | Admin stemt af met partners | Kan wijzigen, naar "Offerte verstuurd" |
| Offerte verstuurd | Klant heeft link ontvangen | Wacht op klant akkoord |
| Akkoord ontvangen | Klant heeft voorwaarden geaccepteerd | Kan naar "Definitief bevestigd" |
| Definitief bevestigd | Alle reserveringen definitief | Afronding en facturatie |
| Verlopen | Geldigheidsdatum verstreken | Admin kan heractiveren |
| Geannuleerd | Door admin of klant geannuleerd | - |

---

## 4. Klantweergave in Offerte-modus

### 4.1 Aangepaste `ProgramOverviewCard`
```
┌─────────────────────────────────────────────────────────────┐
│  Maatwerkvoorstel                                           │
│  Dit voorstel is samengesteld door Bureau Vlieland          │
│  op basis van uw wensen.                                    │
│                                                             │
│  📅 15 – 17 juni 2025  │  👥 45 personen  │  🏷️ Meerdaags  │
│                                                             │
│  ⚠️ Geldig tot: 15 februari 2025                           │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Item Weergave
- **Status "Bevestigd"** → groene badge
- **Status "Optioneel"** → blauwe badge met toelichting
- Alle andere interne statussen verborgen

### 4.3 Verlopen Offerte
Als `quote_valid_until < now()`:
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Deze offerte is verlopen                                │
│                                                             │
│  De geldigheidsdatum van dit voorstel is verstreken.       │
│  Neem contact op met Bureau Vlieland voor een actuele      │
│  offerte.                                                   │
│                                                             │
│  [Contact opnemen]                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. E-mail Flow voor Offerte-modus

### 5.1 Nieuwe E-mail Templates

| Template ID | Naam | Trigger |
|-------------|------|---------|
| `quote_sent_customer` | Offerte verstuurd (Klant) | Admin klikt "Offerte versturen" |
| `quote_reminder_customer` | Offerte herinnering (Klant) | Automatisch 3 dagen voor verlopen |
| `quote_accepted_bureau` | Offerte geaccepteerd (Bureau) | Klant accepteert voorwaarden |
| `quote_accepted_partner` | Reservering definitief (Partner) | Na klantakkoord, per partner |

### 5.2 Template: Offerte verstuurd
```
Onderwerp: Uw maatwerkvoorstel van Bureau Vlieland

Beste {{customer_name}},

Op basis van uw wensen heeft Bureau Vlieland een maatwerkvoorstel 
voor uw evenement op Vlieland samengesteld.

Bekijk uw voorstel via onderstaande link:
[Bekijk voorstel →]

Dit voorstel is geldig tot {{valid_until}}.

Met vriendelijke groet,
Bureau Vlieland
```

### 5.3 "Offerte versturen" Dialoog
```
┌─────────────────────────────────────────────────────────────┐
│  Offerte versturen naar {{customer_name}}                   │
│                                                             │
│  Persoonlijke tekst (optioneel):                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Beste {{customer_name}},                             │  │
│  │                                                       │  │
│  │ Hierbij ons voorstel voor uw teamuitje...           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Geldig tot: [📅 15 feb 2025]                              │
│                                                             │
│  [Annuleren]                         [Offerte versturen]   │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Geen Automatische Partner-communicatie

### 6.1 Edge Function Aanpassingen

**`send-program-request/index.ts`:**
```typescript
// Controleer of dit een quote-mode aanvraag is
if (programRequest.program_type === 'quote') {
  // Geen automatische partner-emails
  // Alleen bevestiging naar Bureau Vlieland
  console.log('Quote mode: skipping partner notifications');
  return;
}

// Bestaande partner-notificatie logica...
```

**`update-partner-item-status/index.ts`:**
```typescript
// Na klantakkoord in quote-mode: verstuur bevestigingen naar partners
if (status === 'definitief_bevestigd' && programType === 'quote') {
  await sendPartnerConfirmations(items);
}
```

### 6.2 Nieuwe Edge Function: `send-quote-offer`
```typescript
// Triggered wanneer admin "Offerte versturen" klikt
// - Update quote_status naar 'offerte_verstuurd'
// - Stuur gepersonaliseerde email naar klant
// - Log in email_log
// - Log in program_request_history
```

---

## 7. Prijsbeheer in Offerte-modus

### 7.1 Admin Prijs Override Interface
```
┌─────────────────────────────────────────────────────────────┐
│  Prijsaanpassing                                            │
│                                                             │
│  Standaardprijs: €32,50 p.p. (x 45 = €1.462,50)            │
│                                                             │
│  Aangepaste prijs:                                          │
│  ○ Per persoon: € [35,00]                                  │
│  ○ Totaal: € [1.575,00]                                    │
│                                                             │
│  Toelichting (intern):                                      │
│  [Hogere seizoensprijs + 8% marge]                         │
│                                                             │
│  □ Toon originele prijs aan klant (doorgestreept)          │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Klantweergave met Override
```
Speedboot tocht
€35,00 per persoon  (was: €32,50)
```

---

## 8. Juridische Akkoordfase

**Ongewijzigd** t.o.v. huidige implementatie:
- AcceptTermsCard blijft identiek
- Zelfde juridische structuur:
  - ☑ Bemiddelingsvoorwaarden Bureau Vlieland
  - ☑ Partner-voorwaarden (bundled of custom)
  - ☑ UVH indien van toepassing
- Ondertekening met naam, timestamp, IP
- Logging in `accepted_terms_log`
- Signature fields in `program_requests`

**Aanvulling voor quote-mode:**
- Na acceptatie: `quote_status` → `'akkoord_ontvangen'`
- Automatische email naar Bureau Vlieland
- Admin kan dan status naar `'definitief_bevestigd'` zetten

---

## 9. Automatische Verloopdatum Check

### 9.1 Database Trigger of Scheduled Function
```sql
-- Dagelijkse check voor verlopen offertes
UPDATE program_requests
SET quote_status = 'verlopen'
WHERE program_type = 'quote'
  AND quote_status = 'offerte_verstuurd'
  AND quote_valid_until < CURRENT_DATE;
```

### 9.2 Klantportaal Gedrag bij Verlopen
- AcceptTermsCard wordt vervangen door "Verlopen" melding
- Geen mogelijkheid om voorwaarden te accepteren
- Contact-informatie prominent

### 9.3 Admin Heractivatie
- Button "Offerte heractiveren" → dialoog met nieuwe geldigheidsdatum
- Status terug naar `'offerte_verstuurd'`
- Optioneel: nieuwe email naar klant

---

## 10. Technische Implementatie Volgorde

### Fase 1: Database (migratie)
1. Nieuwe kolommen op `program_requests` en `program_request_items`
2. Indexes voor filtering op `program_type` en `quote_status`
3. RLS policies aanpassen indien nodig

### Fase 2: Types en Constanten
1. `src/types/programRequest.ts` uitbreiden met quote statussen
2. Nieuwe type `QuoteStatus` en `ItemQuoteStatus`
3. Status config met labels en kleuren

### Fase 3: Admin Componenten
1. `AdminQuoteStatusBadge` component
2. `AdminQuotePriceEditor` component  
3. `AdminSendQuoteDialog` component
4. `AdminQuoteItemRow` met inline status-editor

### Fase 4: Admin Pages
1. `/admin/programma-nieuw` - Wizard voor nieuw programma
2. `AdminRequestDetail` uitbreiden met quote-specifieke controls
3. `AdminProjects` - Filter op programmatype

### Fase 5: Edge Functions
1. `send-quote-offer/index.ts` - Offerte versturen
2. `send-program-request` aanpassen voor quote-mode skip
3. `check-expired-quotes/index.ts` - Verloopdatum check

### Fase 6: E-mail Templates
1. `quote_sent_customer` template aanmaken
2. `quote_reminder_customer` template
3. `quote_accepted_bureau` template
4. `quote_accepted_partner` template

### Fase 7: Klantportaal Aanpassingen
1. `ProgramOverviewCard` - Maatwerkvoorstel variant
2. `AcceptTermsCard` - Verlopen check
3. Quote-specifieke item weergave (Bevestigd/Optioneel)
4. Expired quote banner

### Fase 8: Integratie en Testen
1. End-to-end test: Admin maakt offerte → Klant ontvangt → Acceptatie
2. Verloopdatum scenario's testen
3. Partner-notificatie na akkoord testen

---

## Technische Details

### Nieuwe Types
```typescript
// src/types/programRequest.ts

export type ProgramType = 'self_service' | 'quote';

export type QuoteStatus = 
  | 'concept' 
  | 'in_afstemming' 
  | 'offerte_verstuurd' 
  | 'akkoord_ontvangen' 
  | 'definitief_bevestigd' 
  | 'verlopen' 
  | 'geannuleerd';

export type ItemQuoteStatus = 
  | 'concept' 
  | 'in_afstemming' 
  | 'bevestigd' 
  | 'optioneel';

export const quoteStatusConfig: Record<QuoteStatus, StatusInfo> = {
  concept: {
    label: 'Concept',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    icon: 'FileEdit',
  },
  in_afstemming: {
    label: 'In afstemming',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: 'MessageCircle',
  },
  offerte_verstuurd: {
    label: 'Offerte verstuurd',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: 'Send',
  },
  // ... etc
};
```

### Database Migratie
```sql
-- Nieuwe kolommen program_requests
ALTER TABLE program_requests
ADD COLUMN program_type text NOT NULL DEFAULT 'self_service',
ADD COLUMN quote_status text,
ADD COLUMN quote_valid_until date,
ADD COLUMN quote_sent_at timestamptz,
ADD COLUMN quote_sent_by uuid,
ADD COLUMN admin_created_by uuid;

-- Nieuwe kolommen program_request_items  
ALTER TABLE program_request_items
ADD COLUMN item_quote_status text,
ADD COLUMN admin_price_override numeric,
ADD COLUMN admin_price_notes text,
ADD COLUMN skip_partner_notification boolean DEFAULT false;

-- Index voor filtering
CREATE INDEX idx_program_requests_type ON program_requests(program_type);
CREATE INDEX idx_program_requests_quote_status ON program_requests(quote_status) 
  WHERE program_type = 'quote';
```

---

## Strategisch Resultaat

Met deze uitbreiding wordt de tool:

| Functie | Self-Service | Offerte-modus |
|---------|--------------|---------------|
| **Initiator** | Klant | Bureau Vlieland |
| **Partner-communicatie** | Automatisch | Via Bureau |
| **Prijzen** | Standaard | Aanpasbaar |
| **Workflow** | Direct | Concept → Offerte → Akkoord |
| **Doelgroep** | Kleinere groepen | Zakelijke maatwerktrajecten |

De tool transformeert van een pure self-service marketplace naar een **hybride regisseursplatform** dat zowel autonome klanten als complexe maatwerktrajecten bedient.
