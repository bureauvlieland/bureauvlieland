
# Plan: Programma-omschrijving Veld Toevoegen

## Samenvatting
Een nieuw optioneel tekstveld toevoegen aan programma's waarmee Bureau Vlieland en/of klanten een vrije inleiding/omschrijving kunnen plaatsen. Dit wordt getoond in het bovenste blok op de klantpagina ("Uw Maatwerkvoorstel").

## Wat wordt het?
- **Veldnaam:** `program_description`
- **Locatie:** Onder de titel in het ProgramOverviewCard
- **Bewerkbaar door:** Admin én klant (optioneel)
- **Verplicht:** Nee

## Voorbeeldweergave

```text
┌─────────────────────────────────────────────────────────────┐
│  Uw maatwerkvoorstel                          #REF-2025-42 │
│  Dit voorstel is speciaal voor jullie samengesteld...      │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ "Dit teamuitje staat in het teken van samenwerking     ││
│  │ en ontspanning. We hebben een mix van actieve en       ││
│  │ rustgevende activiteiten samengesteld passend bij      ││
│  │ jullie wens om het team beter te leren kennen."        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  📅 20 - 22 mei 2026    👥 45 personen    ✨ Maatwerk      │
└─────────────────────────────────────────────────────────────┘
```

## Technische Wijzigingen

### 1. Database Migratie

Nieuw veld toevoegen aan `program_requests`:

```sql
ALTER TABLE program_requests
ADD COLUMN program_description TEXT;
```

### 2. Type Definities

**Bestand:** `src/types/programRequest.ts`

Toevoegen aan `ProgramRequest` interface:
```typescript
program_description: string | null;
```

### 3. ProgramOverviewCard Uitbreiden

**Bestand:** `src/components/customer-portal/ProgramOverviewCard.tsx`

- Nieuwe prop: `programDescription?: string | null`
- Weergave onder de subtitle, als er tekst is
- Styling: lichte achtergrond, cursief of quote-stijl

### 4. Desktop/Mobile Views Uitbreiden

**Bestanden:** 
- `src/components/customer-portal/DesktopProgramView.tsx`
- `src/components/customer-portal/MobileProgramView.tsx`

Prop `program_description` doorgeven aan ProgramOverviewCard.

### 5. Hook Uitbreiden

**Bestand:** `src/hooks/useCustomerProgram.ts`

- Veld meenemen bij fetch
- Nieuwe functie: `updateProgramDescription(description: string)`

### 6. Bewerkings-UI

**Optie A - In EditProgramDetailsDialog:**
Textarea toevoegen aan bestaande dialoog.

**Optie B - Inline bewerken:**
Klik op omschrijving om te bewerken (voor klant-facing).

Voorkeur: Optie A voor consistentie.

**Bestand:** `src/components/customer-portal/EditProgramDetailsDialog.tsx`
- Textarea toevoegen voor omschrijving
- Label: "Omschrijving / doel van het programma"
- Placeholder: "Bijv. doel van het uitje, thema, specifieke wensen..."

### 7. Admin Pagina

**Bestand:** `src/pages/admin/AdminRequestDetail.tsx`

- Omschrijving tonen in overzichtsblok
- Bewerkbaar via inline editor of dialoog

## Bestanden die gewijzigd worden

| Bestand | Wijziging |
|---------|-----------|
| Database migratie | Nieuw veld `program_description` |
| `src/types/programRequest.ts` | Type uitbreiden |
| `src/components/customer-portal/ProgramOverviewCard.tsx` | Omschrijving weergeven |
| `src/components/customer-portal/DesktopProgramView.tsx` | Prop doorgeven |
| `src/components/customer-portal/MobileProgramView.tsx` | Prop doorgeven |
| `src/components/customer-portal/EditProgramDetailsDialog.tsx` | Textarea toevoegen |
| `src/hooks/useCustomerProgram.ts` | Update functie toevoegen |
| `src/pages/admin/AdminRequestDetail.tsx` | Weergave + bewerking |

## Resultaat

Na implementatie:
- Bureau Vlieland kan bij maatwerkoffertes een persoonlijke inleiding schrijven
- Klanten kunnen optioneel hun doel/wensen beschrijven
- Omschrijving wordt prominent getoond in het overzichtsblok
- Alle bestaande programma's werken door (veld is optioneel/nullable)
