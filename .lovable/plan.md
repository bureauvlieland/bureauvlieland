

# Plan: Partner Bevestigingsflow Uitbreiden met Tijd/Prijs Aanpassingen

## Probleem

Zoals je op de screenshot ziet, kunnen partners momenteel alleen:
- **Bevestigen** (met prijs) 
- **Niet beschikbaar** markeren

Wat ontbreekt:
- Mogelijkheid om een **alternatief** voor te stellen (andere tijd, aangepaste prijs)
- Velden om **tijd** en **details** aan te passen naast alleen de prijs

## Oplossing

De bestaande `StatusUpdateDialog` component heeft al de juiste 3 opties, maar wordt niet gebruikt. We integreren deze in de flow en breiden de backend uit.

## Visuele Flow Na Aanpassing

```text
Partner opent item details
           │
           ▼
┌──────────────────────────────────────────────────────┐
│  BEVESTIGEN                                          │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Totaalprijs (incl. BTW) *          € [____]     │ │
│  │ Voorgestelde tijd (optioneel)      [________]   │ │
│  │ Toelichting (optioneel)            [________]   │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ALTERNATIEF VOORSTELLEN                             │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Alternatieve tijd *                [________]   │ │
│  │ Alternatieve prijs                 € [____]     │ │
│  │ Toelichting *                      [________]   │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  NIET BESCHIKBAAR                                    │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Reden (optioneel)                  [________]   │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

## Technisch Plan

### 1. Edge Function Aanpassen
**Bestand:** `supabase/functions/update-partner-item-status/index.ts`

- `alternative` toevoegen aan `validStatuses` array (regel 205)
- Optionele velden toevoegen: `proposedTime`, `proposedDate`
- Database update uitbreiden met nieuwe velden
- Email template voor alternative status activeren

### 2. Database Migratie
Nieuwe kolommen toevoegen aan `program_request_items`:
- `proposed_time` (text, nullable) - voorgestelde alternatieve tijd
- `proposed_date` (date, nullable) - voorgestelde alternatieve datum

### 3. PartnerItemSheet Component Aanpassen
**Bestand:** `src/components/partner-portal/PartnerItemSheet.tsx`

Uitbreiden met:
- Radio group met 3 opties (Bevestigen / Alternatief / Niet beschikbaar)
- Conditionele formuliervelden per optie
- Nieuw veld "Voorgestelde tijd" bij bevestiging
- Uitgebreide velden bij alternatief voorstel

### 4. Types Uitbreiden
**Bestand:** `src/types/partner.ts`

Nieuwe velden toevoegen aan `PartnerItem`:
- `proposed_time`
- `proposed_date`

### 5. Email Template voor Alternatieven
Bestaande `STATUS_ALTERNATIVE` template controleren/activeren zodat klanten geïnformeerd worden over het alternatieve voorstel.

## Implementatie Volgorde

1. Database migratie uitvoeren (nieuwe kolommen)
2. Edge function aanpassen (`alternative` status + nieuwe velden)
3. TypeScript types bijwerken
4. PartnerItemSheet UI uitbreiden
5. Testen van volledige flow

## Resultaat

Partners kunnen:
- Bevestigen met prijs én optioneel aangepaste tijd
- Een compleet alternatief voorstel doen (tijd + prijs + toelichting)
- Aangeven dat ze niet beschikbaar zijn met reden

Klanten ontvangen een email bij elk van deze acties.

