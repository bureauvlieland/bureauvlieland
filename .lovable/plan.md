
# Plan: Uniforme Klantpagina (Logies + Activiteiten)

## De Visie

Één klantpagina met een unieke URL waar klanten zowel hun logiesaanvraag als hun activiteitenprogramma kunnen bekijken en beheren. Dit versterkt de boodschap "geen bed, geen programma" en biedt een naadloze klantervaring.

---

## Architectuurkeuze: Program Request als Kern

De uniforme klantpagina zal het `program_request` model als kern gebruiken, met daaraan gekoppeld een optionele `accommodation_request`. Dit heeft de volgende voordelen:

- **Bestaande functionaliteit behouden**: Alle bestaande logica voor activiteiten, facturatie, en voorwaarden blijft intact
- **Logische volgorde**: Eerst logies regelen, daarna activiteiten toevoegen
- **Eén token**: Klant hoeft maar één URL te onthouden/bewaren

---

## Database Wijzigingen

### Optie A: Accommodation Request koppelen aan Program Request (aanbevolen)

```sql
-- Nieuwe kolom in program_requests
ALTER TABLE program_requests 
ADD COLUMN linked_accommodation_id uuid REFERENCES accommodation_requests(id);

-- Index voor snelle lookups
CREATE INDEX idx_program_requests_linked_accommodation 
ON program_requests(linked_accommodation_id);
```

Dit maakt bidirectionele koppeling mogelijk:
- `accommodation_requests.linked_program_id` (bestaand) → voor verwijzing vanuit logies naar programma
- `program_requests.linked_accommodation_id` (nieuw) → voor verwijzing vanuit programma naar logies

### Alternatief: Gemeenschappelijk Token

Een "master token" die beide aanvragen kan opvragen:

```sql
-- Nieuwe tabel voor gecombineerde klantomgevingen
CREATE TABLE customer_portals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_token text UNIQUE NOT NULL,
  accommodation_request_id uuid REFERENCES accommodation_requests(id),
  program_request_id uuid REFERENCES program_requests(id),
  customer_email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '90 days')
);
```

**Aanbeveling**: Optie A is eenvoudiger en past beter bij de huidige structuur.

---

## Nieuwe Pagina Structuur

### Route
```
/mijn-programma/:token
```
(bestaande route behouden, functionaliteit uitbreiden)

### Pagina Secties (top-to-bottom)

```
┌─────────────────────────────────────────────────────────────┐
│  Header (logo + vernieuwen)                                 │
├─────────────────────────────────────────────────────────────┤
│  Welkom [bedrijfsnaam] • [aantal personen] • [datum range]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  SECTIE 1: LOGIES                                     │  │
│  │  ├─ Status banner (zoekend/offertes beschikbaar)      │  │
│  │  ├─ Accommodatie samenvatting (indien gekozen)        │  │
│  │  ├─ Offertes vergelijken (indien niet gekozen)        │  │
│  │  └─ "Nog geen logies aangevraagd?" CTA (indien leeg)  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  SECTIE 2: ACTIVITEITEN                               │  │
│  │  ├─ Status summary (X bevestigd, Y in afwachting)     │  │
│  │  ├─ Dag tabs met programma items                      │  │
│  │  └─ "Activiteit toevoegen" button                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  SECTIE 3: EXTRA'S                                    │  │
│  │  ├─ Fietsverhuur banner                               │  │
│  │  └─ Catering suggestie (indien niet in programma)     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  SECTIE 4: FACTURATIE                                 │  │
│  │  ├─ Totaaloverzicht (logies + activiteiten)           │  │
│  │  ├─ Billing details                                   │  │
│  │  └─ Wie factureert wat                                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  SECTIE 5: VOORWAARDEN & BEVESTIGING                  │  │
│  │  (alleen actief als alles bevestigd + billing klaar)  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  SECTIE 6: GESCHIEDENIS                               │  │
│  │  (timeline van alle wijzigingen)                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Nieuwe Component: AccommodationSection

```text
src/components/customer-portal/AccommodationSection.tsx
```

Deze component toont de logies-status en -offertes binnen de klantpagina:

### States

1. **Geen logies gekoppeld**
   - Bericht: "Meerdaags programma? Begin met logies!"
   - CTA: "Vraag logies aan" → opent wizard met pre-filled data

2. **Logies aangevraagd, geen offertes**
   - Status banner: "We zoeken passende accommodaties"
   - Verwachte reactietijd

3. **Offertes beschikbaar**
   - Compacte offerte-kaarten (vergelijkbaar met huidige)
   - "Details bekijken" opent sheet
   - "Kiezen" selecteert offerte

4. **Offerte gekozen**
   - Bevestigde accommodatie-kaart met details
   - Eventueel contactgegevens accommodatie

---

## Hook Wijziging: useCustomerProgram

Uitbreiden met logies-data:

```typescript
interface UseCustomerProgramReturn {
  // Bestaande velden...
  program: ProgramRequestWithItems | null;
  
  // Nieuw: gekoppelde logiesaanvraag
  accommodation: AccommodationRequest | null;
  accommodationQuotes: AccommodationQuote[];
  
  // Nieuw: logies acties
  selectAccommodationQuote: (quoteId: string) => Promise<boolean>;
  accommodationSummary: {
    hasAccommodation: boolean;
    status: 'none' | 'pending' | 'quoted' | 'selected';
    selectedQuote: AccommodationQuote | null;
  };
}
```

---

## Flow Wijzigingen

### Scenario 1: Klant start met logies (aanbevolen flow)

```text
1. Klant gaat naar /logies-vlieland
2. Klant doorloopt wizard en verzendt aanvraag
3. Systeem maakt accommodation_request EN program_request aan
4. Klant ontvangt email met link naar /mijn-programma/:token
5. Klant ziet beide secties (logies + activiteiten leeg)
6. Klant kan wachten op offertes EN alvast activiteiten toevoegen
```

### Scenario 2: Klant start met activiteiten

```text
1. Klant gaat naar /programma-samenstellen
2. Klant stelt programma samen en verzendt aanvraag
3. Klant ontvangt email met link naar /mijn-programma/:token
4. Klant ziet activiteiten + banner "Meerdaags? Vraag logies aan"
5. CTA opent logies-wizard met pre-filled data
6. Na verzenden wordt accommodation_request gekoppeld aan program_request
```

---

## Aanpassingen Bestaande Code

### 1. CustomerProgram.tsx
- Importeer en gebruik nieuwe `AccommodationSection` component
- Voeg logies-data toe aan hook call
- Integreer logies in prijsoverzicht

### 2. useCustomerProgram.ts
- Fetch gekoppelde accommodation_request
- Fetch accommodation_quotes
- Voeg selectAccommodationQuote functie toe

### 3. AccommodationWizard / logies-aanvragen
- Optie toevoegen om bestaand program_request token mee te geven
- Bij verzenden: koppel aan bestaand program_request als token aanwezig

### 4. send-program-request edge function
- Optioneel: automatisch lege accommodation_request aanmaken voor meerdaagse programma's

### 5. PriceSummaryCard.tsx
- Logies-kosten toevoegen aan totaaloverzicht

---

## Verwijderen / Redirect

### AccommodationQuotes.tsx pagina
Na implementatie kan `/mijn-logies/:token` redirecten naar `/mijn-programma/:token` met de gekoppelde program_token.

### App.tsx route aanpassing
```tsx
// Redirect oude logies-portal naar nieuwe uniforme pagina
<Route 
  path="/mijn-logies/:token" 
  element={<Navigate to={`/mijn-programma/${token}`} replace />} 
/>
```
(Of behouden als legacy route die automatisch redirect)

---

## Fietsverhuur Integratie

Toevoegen van fietsverhuur-banner in de "Extra's" sectie:

```text
src/components/customer-portal/ExtrasSection.tsx
```

Met:
- Fietsverhuur CTA (externe link)
- Eventueel catering-suggestie

---

## Technische Details

### Nieuwe Bestanden

| Bestand | Doel |
|---------|------|
| `src/components/customer-portal/AccommodationSection.tsx` | Logies sectie in klantportaal |
| `src/components/customer-portal/AccommodationSummaryCard.tsx` | Compacte weergave gekozen accommodatie |
| `src/components/customer-portal/ExtrasSection.tsx` | Fietsverhuur + extras |
| `src/components/FietsverhuurBanner.tsx` | Herbruikbare fietsverhuur CTA |

### Aan te passen Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/CustomerProgram.tsx` | AccommodationSection + ExtrasSection toevoegen |
| `src/hooks/useCustomerProgram.ts` | Logies data + quotes + acties toevoegen |
| `src/components/customer-portal/MobileProgramView.tsx` | Logies + extras secties integreren |
| `src/components/customer-portal/DesktopProgramView.tsx` | Logies + extras secties integreren |
| `src/components/customer-portal/PriceSummaryCard.tsx` | Logies kosten optellen |
| `src/pages/LogiesAanvragen.tsx` | Optionele koppeling aan bestaand program |

### Database Migratie

```sql
-- Koppeling van program naar accommodation
ALTER TABLE program_requests 
ADD COLUMN linked_accommodation_id uuid REFERENCES accommodation_requests(id);

CREATE INDEX idx_program_requests_linked_accommodation 
ON program_requests(linked_accommodation_id);

-- Update RLS indien nodig
```

---

## Voordelen van deze aanpak

1. **Één URL voor alles**: Klant hoeft maar één link te bewaren
2. **Logische flow**: Visueel wordt duidelijk dat logies eerst komt
3. **Flexibiliteit**: Klant kan beginnen waar ze willen
4. **Overzichtelijk**: Totaalkosten (logies + activiteiten) in één overzicht
5. **Toekomstbestendig**: Makkelijk uit te breiden met andere diensten

---

## Implementatie Volgorde

1. Database migratie (koppeling toevoegen)
2. Hook aanpassen (logies data fetchen)
3. AccommodationSection component bouwen
4. FietsverhuurBanner component bouwen
5. CustomerProgram pagina uitbreiden
6. Mobile + Desktop views updaten
7. Logies wizard koppeling mogelijk maken
8. Oude routes redirecten

---

## Beantwoording van je vraag

**"De klantpagina blijft behouden en is aangepast met het onderdeel logies?"**

Ja, precies:
- De `/mijn-programma/:token` pagina blijft bestaan
- Wordt uitgebreid met een **Logies sectie** bovenaan
- Logies-offertes kunnen direct in deze pagina vergeleken en gekozen worden
- Na keuze worden activiteiten + logies samen getoond
- Facturatie combineert beide

**"Zodat klanten daarna via hun klantenpagina ook nog activiteiten kunnen aanvragen?"**

Ja:
- De bestaande "Activiteit toevoegen" functionaliteit blijft
- Wordt alleen zichtbaar/actief nadat logies geregeld is (optioneel)
- Of altijd zichtbaar maar met tip-banner over logies

