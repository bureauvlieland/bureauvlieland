
# Plan: Programma-omschrijving Veld Toevoegen ✅ GEÏMPLEMENTEERD

## Samenvatting
Een nieuw optioneel tekstveld toegevoegd aan programma's waarmee Bureau Vlieland en/of klanten een vrije inleiding/omschrijving kunnen plaatsen. Dit wordt getoond in het bovenste blok op de klantpagina ("Uw Maatwerkvoorstel").

## Wat is gebouwd?
- **Veldnaam:** `program_description`
- **Locatie:** Onder de titel in het ProgramOverviewCard
- **Bewerkbaar door:** Admin én klant (via EditProgramDetailsDialog)
- **Verplicht:** Nee

## Technische Wijzigingen Uitgevoerd

### ✅ 1. Database Migratie
Nieuw veld toegevoegd aan `program_requests`:
```sql
ALTER TABLE program_requests ADD COLUMN program_description TEXT;
```

### ✅ 2. Type Definities
`src/types/programRequest.ts` - ProgramRequest interface uitgebreid met:
```typescript
program_description: string | null;
```

### ✅ 3. ProgramOverviewCard 
`src/components/customer-portal/ProgramOverviewCard.tsx`
- Nieuwe prop: `programDescription?: string | null`
- Weergave onder de subtitle, in quote-stijl met lichte achtergrond

### ✅ 4. Desktop/Mobile Views
- `src/components/customer-portal/DesktopProgramView.tsx` - Prop doorgegeven
- `src/components/customer-portal/MobileProgramView.tsx` - Prop doorgegeven

### ✅ 5. EditProgramDetailsDialog
`src/components/customer-portal/EditProgramDetailsDialog.tsx`
- Textarea toegevoegd voor omschrijving
- Label: "Omschrijving / doel (optioneel)"
- Placeholder: "Bijv. doel van het uitje, thema, specifieke wensen..."

### ✅ 6. Hook
`src/hooks/useCustomerProgram.ts`
- `updateProgramDetails` functie uitgebreid met `programDescription` parameter

### ✅ 7. Edge Function
`supabase/functions/update-customer-program/index.ts`
- Ondersteuning toegevoegd voor `programDescription` in updates
- History logging voor wijzigingen

### ✅ 8. Admin Pagina
`src/pages/admin/AdminRequestDetail.tsx`
- Omschrijving getoond in "Evenement details" kaart
- Styling: italics in quote-stijl

### ✅ 9. CustomerProgram Pagina
`src/pages/CustomerProgram.tsx`
- `programDescription` prop doorgegeven aan EditProgramDetailsDialog

## Resultaat
- ✅ Bureau Vlieland kan bij maatwerkoffertes een persoonlijke inleiding schrijven
- ✅ Klanten kunnen optioneel hun doel/wensen beschrijven
- ✅ Omschrijving wordt prominent getoond in het overzichtsblok
- ✅ Alle bestaande programma's werken door (veld is optioneel/nullable)
- ✅ Wijzigingen worden gelogd in history
