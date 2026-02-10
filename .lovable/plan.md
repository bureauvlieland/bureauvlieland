
# Datum en tijd toevoegen aan logies-offerte extra's

## Wat verandert
Extra diensten bij logiesoffertes (bijv. lunch, parkeren) krijgen twee optionele velden: **datum** en **tijdstip**. Hiermee kan een partner aangeven op welke dag (en eventueel hoe laat) een extra geldt. Admins kunnen deze velden ook aanpassen.

## Wijzigingen

### 1. Database migratie
Twee nieuwe kolommen toevoegen aan `accommodation_quote_extras`:
- `service_date` (type `date`, nullable) -- de dag waarop de extra geldt
- `service_time` (type `time without time zone`, nullable) -- optioneel tijdstip

### 2. TypeScript types bijwerken
In `src/types/accommodationExtras.ts`:
- `service_date: string | null` en `service_time: string | null` toevoegen aan `AccommodationQuoteExtra`
- Dezelfde velden als optioneel toevoegen aan `AccommodationQuoteExtraInsert` en `AccommodationQuoteExtraUpdate`

### 3. Partner formulier: AddQuoteExtraDialog
In `src/components/partner-portal/AddQuoteExtraDialog.tsx`:
- Twee nieuwe velden toevoegen aan het formulier: een datumpicker en een tijdinvoer (type `time`)
- Beide optioneel (de partner "kan" ze invullen)
- Velden meesturen bij insert/update

### 4. Partner weergave: QuoteExtrasList
In `src/components/partner-portal/QuoteExtrasList.tsx`:
- Datum en tijd tonen bij elke extra (indien ingevuld), bijv. "di 15 jul" en "12:30"

### 5. Admin aanpassing
De `QuoteExtrasList` component wordt al (of kan worden) gebruikt in de admin context met `readOnly={false}`. Dit betekent dat admins via dezelfde "Extra bewerken" dialog de datum en tijd kunnen aanpassen. Geen aparte admin-component nodig.

## Technisch

### Migratie SQL
```sql
ALTER TABLE accommodation_quote_extras
  ADD COLUMN service_date date,
  ADD COLUMN service_time time without time zone;
```

### Bestanden die worden gewijzigd
- **Database**: nieuwe migratie voor twee kolommen
- `src/types/accommodationExtras.ts` -- type-uitbreiding
- `src/components/partner-portal/AddQuoteExtraDialog.tsx` -- datum/tijd velden in formulier
- `src/components/partner-portal/QuoteExtrasList.tsx` -- datum/tijd tonen in lijst
