
# Plan: Voorwaarden & Akkoordflow Upgrade

## Samenvatting
Dit plan implementeert een volledige upgrade van de voorwaarden- en akkoordflow conform de juridische briefing, met:
1. **Partner settings**: Optie voor eigen voorwaarden-PDF OF standaardvoorwaarden
2. **Checkout flow**: Herschreven teksten en facturatie-blok
3. **Na akkoord**: Permanente zichtbaarheid van geaccepteerde voorwaarden
4. **Versioning**: Opslag van welke voorwaarden-versies zijn geaccepteerd

---

## Deel 1: Database Uitbreiding

### Nieuwe kolommen in `partners` tabel
```sql
ALTER TABLE partners ADD COLUMN uses_default_terms boolean DEFAULT false;
```
- `uses_default_terms`: Partner geeft aan standaardvoorwaarden Bureau Vlieland te hanteren

### Nieuwe tabel: `accepted_terms_log`
```sql
CREATE TABLE accepted_terms_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES program_requests(id),
  partner_id text NOT NULL,
  partner_name text NOT NULL,
  terms_type text NOT NULL, -- 'partner_custom', 'partner_default', 'bureau_vlieland', 'uvh_2024'
  terms_version text NOT NULL,
  terms_pdf_path text, -- Snapshot of PDF path at moment of acceptance
  accepted_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index voor snelle lookups per request
CREATE INDEX idx_accepted_terms_request ON accepted_terms_log(request_id);
```

Dit slaat per boeking exact op welke voorwaarden-versies zijn geaccepteerd.

---

## Deel 2: Partner Settings Uitbreiden

### PartnerTermsUpload.tsx aanpassen

Huidige situatie: Partner kan alleen PDF uploaden.

Nieuwe situatie:
```
┌─────────────────────────────────────────────────────┐
│  📄 Algemene Voorwaarden                            │
│                                                     │
│  Kies hoe je voorwaarden worden getoond:            │
│                                                     │
│  ○ Eigen voorwaarden uploaden (PDF)                 │
│    ┌───────────────────────────────────────┐        │
│    │ algemene-voorwaarden.pdf    [Bekijk]  │        │
│    │ Geüpload op 15 januari 2026           │        │
│    └───────────────────────────────────────┘        │
│    [Nieuwe PDF uploaden]                            │
│                                                     │
│  ○ Standaardvoorwaarden Bureau Vlieland             │
│    ℹ️ De standaard bemiddelingsvoorwaarden van      │
│    Bureau Vlieland worden getoond aan klanten.      │
│    Deze dekken de meeste situaties.                 │
│    [Bekijk standaardvoorwaarden →]                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Logica:
- Radio button keuze: `uses_default_terms = true/false`
- Bij "Eigen voorwaarden": bestaande upload-functionaliteit
- Bij "Standaard": link naar Bureau Vlieland standaard-PDF

---

## Deel 3: AcceptTermsCard Herschrijven

### Huidige teksten vervangen:

**Voorwaardenblok (herschrijven)**

Van:
```
Let op: voor de activiteiten in je programma zijn ook de voorwaarden 
van de volgende aanbieders van toepassing:
```

Naar:
```
Voor dit programma gelden de volgende voorwaarden:
```

**Per partner tonen:**
- Partnernaam + link naar PDF
- Als partner geen eigen voorwaarden heeft maar `uses_default_terms = true`: 
  "Standaardvoorwaarden Partneraanbod Bureau Vlieland" met link
- Als partner geen voorwaarden heeft: automatisch standaardvoorwaarden tonen

**Checkbox tekst (herschrijven)**

Van:
```
Ik ga akkoord met de algemene voorwaarden van Bureau Vlieland 
en de voorwaarden van bovenstaande aanbieders
```

Naar:
```
Ik ga akkoord met:
– de bemiddelingsvoorwaarden van Bureau Vlieland
– de voorwaarden van de hierboven genoemde aanbieders
```

**Digitale ondertekening sectie (vereenvoudigen)**

Van:
```
• Je bent bevoegd namens de organisatie
• Je hebt de voorwaarden gelezen en gaat akkoord
• Reserveringen worden definitief bevestigd
• Annuleringsvoorwaarden zijn van toepassing
```

Naar:
```
• Reserveringen worden definitief bevestigd
• Annuleringsvoorwaarden zijn van toepassing
```

---

## Deel 4: InvoiceProvidersCard Herschrijven

### Tekst aanpassingen

**Kop wijzigen:**

Van: "Wie stuurt je een factuur?"

Naar: "Facturatie per onderdeel"

**Subtekst wijzigen:**

Van: "Voor dit programma ontvang je facturen van de volgende partijen:"

Naar: "Voor dit programma ontvang je afzonderlijke facturen van de onderstaande partijen."

**Per partner toevoegen:**
```
Uitvoering & factuur door: [Partnernaam]
```

**Bureau Vlieland sectie:**
```
Coördinatie & handling
Factuur door: Bureau Vlieland
```

---

## Deel 5: Permanente Zichtbaarheid Na Akkoord

### Nieuwe component: AcceptedTermsCard.tsx

Wordt getoond in plaats van AcceptTermsCard wanneer `terms_accepted_at` is gevuld:

```
┌─────────────────────────────────────────────────────┐
│  ✓ Boeking definitief bevestigd                     │
├─────────────────────────────────────────────────────┤
│  Geaccepteerde voorwaarden                          │
│                                                     │
│  Geaccepteerd op: 28 januari 2026 om 14:32          │
│  Door: Jan de Vries                                 │
│  Ondertekening ID: SIG-2026-001234                  │
│                                                     │
│  De volgende voorwaarden zijn van toepassing:       │
│                                                     │
│  📄 Bemiddelingsvoorwaarden Bureau Vlieland         │
│     Versie 2026-01 · Download PDF                   │
│                                                     │
│  📄 Voorwaarden Brouwerij Fortuna                   │
│     Versie 2026-01 · Download PDF                   │
│                                                     │
│  📄 Voorwaarden Vliehors Expres                     │
│     Standaardvoorwaarden · Download PDF             │
│                                                     │
│  📄 Uniforme Voorwaarden Horeca 2024                │
│     (Koninklijke Horeca Nederland) · Download PDF   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Implementatie:

1. **Bij acceptatie**: Edge function slaat snapshot op van alle voorwaarden in `accepted_terms_log`
2. **Na acceptatie**: Frontend toont AcceptedTermsCard met data uit log
3. **PDF links**: Blijven permanent downloadbaar

---

## Deel 6: Edge Function Uitbreiden

### update-customer-program/index.ts

Bij `acceptTerms = true`:

1. **Verzamel alle partners** uit de items
2. **Voor elke partner**: Log naar `accepted_terms_log`:
   ```typescript
   {
     request_id: program.id,
     partner_id: partner.id,
     partner_name: partner.name,
     terms_type: partner.terms_pdf_path ? 'partner_custom' : 'partner_default',
     terms_version: new Date().toISOString().slice(0,7), // 2026-01
     terms_pdf_path: partner.terms_pdf_path || 'default/standaard-partnervoorwaarden.pdf',
     accepted_at: new Date().toISOString(),
   }
   ```
3. **Bureau Vlieland voorwaarden**: Log apart
4. **UVH 2024**: Log indien horeca-items aanwezig

---

## Deel 7: Vaste Voorwaarden-bestanden

### Aanmaken in storage bucket `partner-terms`:

1. `default/bemiddelingsvoorwaarden-bureau-vlieland.pdf` - Bureau Vlieland's eigen voorwaarden
2. `default/standaard-partnervoorwaarden.pdf` - Fallback voor partners zonder eigen voorwaarden
3. `default/uvh-2024.pdf` - Uniforme Voorwaarden Horeca

Deze worden éénmalig geüpload en blijven permanent beschikbaar.

---

## Bestanden die worden aangepast

### Database
- Migratie: kolom `uses_default_terms` toevoegen aan `partners`
- Migratie: nieuwe tabel `accepted_terms_log`

### Frontend componenten
| Bestand | Wijziging |
|---------|-----------|
| `PartnerTermsUpload.tsx` | Radio-keuze toevoegen: eigen PDF of standaard |
| `AcceptTermsCard.tsx` | Teksten herschrijven conform briefing |
| `InvoiceProvidersCard.tsx` | Kop en teksten aanpassen |
| `DesktopProgramView.tsx` | AcceptedTermsCard tonen na akkoord |
| `MobileProgramView.tsx` | AcceptedTermsCard tonen na akkoord |

### Nieuwe componenten
| Bestand | Doel |
|---------|------|
| `AcceptedTermsCard.tsx` | Permanente weergave geaccepteerde voorwaarden |

### Backend
| Bestand | Wijziging |
|---------|-----------|
| `update-customer-program/index.ts` | Voorwaarden-snapshot opslaan bij acceptatie |
| `get-customer-program/index.ts` | Accepted terms log meesturen |

### Types
| Bestand | Wijziging |
|---------|-----------|
| `src/types/partner.ts` | `uses_default_terms` toevoegen |
| `src/types/programRequest.ts` | `AcceptedTermsEntry` type toevoegen |

---

## Visuele samenvatting flow

```
PARTNER SETTINGS
     │
     ├─ Eigen PDF uploaden ──────────────────────┐
     │                                            │
     └─ Standaardvoorwaarden selecteren ─────────┤
                                                  │
                                                  ▼
KLANT CHECKOUT ──────────────────────────────────┐
│                                                 │
│  "Voor dit programma gelden de volgende         │
│   voorwaarden:"                                 │
│                                                 │
│   • Bemiddelingsvoorwaarden Bureau Vlieland    │
│   • Voorwaarden [Partner A] (PDF)              │
│   • Standaardvoorwaarden [Partner B]           │
│   • UVH 2024 (indien horeca)                   │
│                                                 │
│  ☐ Ik ga akkoord met:                          │
│    – de bemiddelingsvoorwaarden van BV         │
│    – de voorwaarden van bovenstaande aanbieders│
│                                                 │
│  [Ondertekenen & Definitief boeken]            │
└─────────────────────────────────────────────────┘
                    │
                    ▼
NA AKKOORD ──────────────────────────────────────┐
│                                                 │
│  ✓ Boeking definitief bevestigd                │
│                                                 │
│  Geaccepteerd op: 28 jan 2026, 14:32           │
│  Door: Jan de Vries                            │
│  ID: SIG-2026-001234                           │
│                                                 │
│  📄 Bemiddelingsvoorwaarden BV (v2026-01)      │
│  📄 Voorwaarden Partner A (v2026-01)           │
│  📄 Standaardvoorwaarden Partner B             │
│  📄 UVH 2024                                   │
│                                                 │
│  [Download alle voorwaarden als ZIP]            │
└─────────────────────────────────────────────────┘
```

---

## Implementatievolgorde

1. **Database migraties** - Kolom en tabel aanmaken
2. **Partner settings** - uses_default_terms optie toevoegen
3. **AcceptTermsCard** - Teksten herschrijven
4. **InvoiceProvidersCard** - Teksten aanpassen
5. **Edge function** - Voorwaarden-snapshot bij acceptatie
6. **AcceptedTermsCard** - Nieuwe component voor na akkoord
7. **Desktop/Mobile views** - AcceptedTermsCard integreren
8. **get-customer-program** - Accepted terms log meesturen
