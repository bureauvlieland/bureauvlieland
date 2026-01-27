

# Plan: Klant Frontend voor Logies Offertes

## Overzicht

Dit plan beschrijft de implementatie van een klantgerichte pagina waar klanten hun logies aanvraag kunnen volgen, ontvangen offertes kunnen bekijken en vergelijken, en een offerte kunnen accepteren. De pagina volgt dezelfde patronen als de bestaande Customer Program portal (`/mijn-programma/:token`).

---

## Workflow voor de Klant

```text
┌─────────────────────────────────────────────────────────────────┐
│                    KLANT LOGIES FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. AANVRAAG INGEDIEND                                         │
│     Klant ontvangt email met link naar trackingpagina           │
│                                                                 │
│  2. WACHTEN OP OFFERTES                                        │
│     Pagina toont "We verzamelen offertes voor je"               │
│     Status indicator: X van Y partners benaderd                 │
│                                                                 │
│  3. OFFERTES ONTVANGEN                                         │
│     Klant ziet kaarten met alle ontvangen offertes              │
│     Vergelijking op prijs, faciliteiten, locatie                │
│                                                                 │
│  4. OFFERTE SELECTEREN                                         │
│     Klant kiest gewenste offerte                                │
│     Bevestigingsflow met contactgegevens                        │
│                                                                 │
│  5. PROGRAMMA UITBREIDEN (optioneel)                           │
│     Link naar activiteiten configurator als gewenst             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technische Implementatie

### 1. Nieuwe Route

| Route | Component | Beschrijving |
|-------|-----------|--------------|
| `/mijn-logies/:token` | `AccommodationQuotes.tsx` | Klant logies portal |

### 2. Nieuwe Pagina: `AccommodationQuotes.tsx`

**Locatie:** `src/pages/AccommodationQuotes.tsx`

**Functionaliteiten:**
- Ophalen van `accommodation_requests` via `customer_token`
- Weergave van aanvraagstatus en details
- Lijst van ontvangen `accommodation_quotes` met status `submitted` of `selected`
- Mogelijkheid om een offerte te selecteren
- Doorlink naar activiteiten configurator indien gewenst

**Structuur:**
```text
┌─────────────────────────────────────────────────────────────┐
│  [Logo]                                      [Vernieuwen]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Jouw Logies Aanvraag                                       │
│  [Bedrijfsnaam] • 25 personen • 3 nachten                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅 15-18 mei 2026                                   │   │
│  │  🏨 Hotel of vakantiewoning                         │   │
│  │  👥 25 gasten                                       │   │
│  │  📍 In het dorp of aan het strand                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STATUS: Offertes ontvangen (2 van 3 partners)              │
│  ████████████░░░░ 66%                                       │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  BESCHIKBARE OFFERTES                                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏨 Hotel Zeezicht                                  │   │
│  │                                                      │   │
│  │  €85 per persoon per nacht                          │   │
│  │  Totaal: €6.375 (excl. BTW)                         │   │
│  │                                                      │   │
│  │  ✓ Ontbijt inbegrepen                              │   │
│  │  ✓ Gratis WiFi                                     │   │
│  │  ✓ Parkeren                                        │   │
│  │                                                      │   │
│  │  Geldig tot: 1 feb 2026                            │   │
│  │                                                      │   │
│  │  [Bekijk details]        [Deze offerte kiezen ✓]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏨 Strandhotel Vlieland                            │   │
│  │  ...                                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Wil je ook activiteiten toevoegen?                         │
│  [Naar programma samenstellen →]                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3. Custom Hook: `useAccommodationQuotes.ts`

**Locatie:** `src/hooks/useAccommodationQuotes.ts`

**Functionaliteiten:**
- Fetch accommodation request via token
- Fetch bijbehorende quotes
- Select quote functie (roept Edge Function aan)
- Status berekening (hoeveel offertes ontvangen vs verwacht)

**Interface:**
```typescript
interface UseAccommodationQuotesReturn {
  request: AccommodationRequest | null;
  quotes: AccommodationQuote[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  selectQuote: (quoteId: string) => Promise<boolean>;
  quotesSummary: {
    total: number;      // Aantal partners benaderd
    received: number;   // Aantal offertes ontvangen
    selected: number;   // 0 of 1 (geselecteerde offerte)
  };
}
```

### 4. Nieuwe Componenten

| Component | Locatie | Beschrijving |
|-----------|---------|--------------|
| `AccommodationRequestSummary` | `src/components/accommodation-portal/AccommodationRequestSummary.tsx` | Toont aanvraag samenvatting (data, gasten, type) |
| `AccommodationQuoteCard` | `src/components/accommodation-portal/AccommodationQuoteCard.tsx` | Enkele offerte kaart met details en selectie knop |
| `AccommodationQuoteComparison` | `src/components/accommodation-portal/AccommodationQuoteComparison.tsx` | Vergelijkingstabel voor meerdere offertes |
| `AccommodationStatusBanner` | `src/components/accommodation-portal/AccommodationStatusBanner.tsx` | Status indicator (wachtend/offertes ontvangen/geselecteerd) |
| `AccommodationQuoteDetailSheet` | `src/components/accommodation-portal/AccommodationQuoteDetailSheet.tsx` | Sheet met volledige offerte details |
| `SelectQuoteDialog` | `src/components/accommodation-portal/SelectQuoteDialog.tsx` | Bevestigingsdialoog voor offerte selectie |

### 5. Edge Function: `select-accommodation-quote`

**Locatie:** `supabase/functions/select-accommodation-quote/index.ts`

**Functionaliteiten:**
- Validatie van customer token
- Update quote status naar `selected`
- Update request status naar `accepted`
- Automatisch afwijzen van andere quotes
- Email notificatie naar geselecteerde partner
- Email notificatie naar klant (bevestiging)
- Optioneel: Email naar admin

**Request body:**
```typescript
{
  token: string;
  quoteId: string;
}
```

### 6. Email Templates

| Trigger | Ontvanger | Onderwerp |
|---------|-----------|-----------|
| Quote geselecteerd | Partner | "Uw offerte voor [klant] is geaccepteerd" |
| Quote geselecteerd | Klant | "Bevestiging van uw logies reservering" |
| Quote afgewezen | Partner | "Update over uw offerte" |

---

## Component Details

### AccommodationQuoteCard

Visuele kaart voor een enkele offerte met:
- Accommodatienaam en type icoon
- Prijs per persoon per nacht + totaalprijs
- Inbegrepen faciliteiten (badges)
- Kamerconfiguratie samenvatting
- Geldigheidsdatum
- Status badge (als geselecteerd)
- "Bekijk details" en "Selecteren" knoppen

### AccommodationStatusBanner

Dynamische banner die de huidige status toont:
- **Wachtend**: "We zijn offertes aan het verzamelen..." met progress indicator
- **Offertes beschikbaar**: "Je hebt X offertes ontvangen. Bekijk en kies hieronder."
- **Geselecteerd**: "Je hebt een keuze gemaakt! De accommodatie neemt contact met je op."

### SelectQuoteDialog

Bevestigingsdialoog met:
- Offerte samenvatting
- Waarschuwing dat keuze definitief is
- Optie om opmerking toe te voegen
- Bevestigingsknop

---

## Database Aanpassingen

Geen nieuwe tabellen nodig. De bestaande structuur ondersteunt deze functionaliteit:
- `accommodation_requests.customer_token` → toegang voor klant
- `accommodation_quotes.status` → `selected` wanneer klant kiest
- `accommodation_requests.status` → `accepted` na selectie

---

## Route Toevoegingen

**In `App.tsx`:**
```tsx
import AccommodationQuotes from "./pages/AccommodationQuotes";

// In Routes:
<Route path="/mijn-logies/:token" element={<AccommodationQuotes />} />
```

---

## Bestandenlijst

| Bestand | Actie |
|---------|-------|
| `src/pages/AccommodationQuotes.tsx` | Nieuw |
| `src/hooks/useAccommodationQuotes.ts` | Nieuw |
| `src/components/accommodation-portal/AccommodationRequestSummary.tsx` | Nieuw |
| `src/components/accommodation-portal/AccommodationQuoteCard.tsx` | Nieuw |
| `src/components/accommodation-portal/AccommodationStatusBanner.tsx` | Nieuw |
| `src/components/accommodation-portal/AccommodationQuoteDetailSheet.tsx` | Nieuw |
| `src/components/accommodation-portal/SelectQuoteDialog.tsx` | Nieuw |
| `supabase/functions/select-accommodation-quote/index.ts` | Nieuw |
| `src/App.tsx` | Bijwerken (route toevoegen) |

---

## UX Overwegingen

1. **Mobiel-eerst ontwerp**: De pagina moet goed werken op telefoons aangezien klanten mogelijk de link vanuit email openen
2. **Duidelijke status communicatie**: Klanten moeten direct zien waar ze staan in het proces
3. **Vergelijkbaarheid**: Offertes moeten makkelijk naast elkaar te vergelijken zijn
4. **Urgentie indicatie**: Geldigheidsdatum van offertes prominent tonen
5. **Doorlink naar activiteiten**: Als klant aangaf ook activiteiten te willen, prominente CTA om door te gaan naar configurator

---

## Fasering

Dit plan kan in één implementatieronde worden uitgevoerd:

1. **Hook en pagina structuur** - Data ophalen en basisweergave
2. **Quote cards en vergelijking** - Visuele offerte weergave
3. **Selectie flow** - Dialog en edge function
4. **Email notificaties** - Bevestigingsmails
5. **Doorlink naar programma** - Integratie met activiteiten configurator

