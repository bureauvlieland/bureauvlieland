# Pending partner-instructie wordt niet naar partner gepushed

## Wat ik in de database vond

Item `9e53bd28… "Lunch op locatie"` (provider `zuiver`) bij project `5a5719d2`:

- `partner_instructions` = **NULL** (live, dit ziet de partner)
- `pending_partner_instructions` = `"Brengen op de Speelweide aan de badweg. Wellicht wat biertafel sets meenemen?"`
- `pending_changed_at` = **NULL**
- `updated_at` = 26-05 12:48:31 (= exact het tijdstip van de laatste publish-run)
- `program_requests.last_published_at` = 26-05 12:48:31
- `program_change_log` heeft voor die publish-run **0 entries**

Dus: u heeft op "Publiceer & verstuur" geklikt, de edge function is gedraaid, maar deed niets met dit item. Daarna is de instructie blijven hangen als pending — onzichtbaar voor de partner én onzichtbaar voor de volgende publish-run.

## Root cause

`supabase/functions/publish-program-changes/index.ts` haalt items op met:

```text
WHERE pending_changed_at IS NOT NULL
   OR pending_marked_for_removal = true
   OR pending_added = true
```

Als een autosave wel `pending_partner_instructions` (of een ander pending-veld) wegschrijft maar `pending_changed_at` op NULL laat staan (race condition tussen autosave en publish, of een eerdere publish die wél het tijdstip cleart maar het pending-veld niet), is het item daarna onzichtbaar voor élke volgende publish. Partner ziet nooit iets, admin denkt dat het verzonden is.

## Fix in twee delen

### 1. Defensieve filter in `publish-program-changes`

Vervang de query door een variant die ook items pakt waar feitelijk een pending-waarde staat, niet alleen waar het timestamp gezet is:

```text
pending_changed_at NOT NULL
OR pending_marked_for_removal
OR pending_added
OR pending_block_name        NOT NULL
OR pending_admin_price_notes NOT NULL
OR pending_customer_notes    NOT NULL
OR pending_partner_instructions NOT NULL
OR pending_preferred_time    NOT NULL
OR pending_day_index         NOT NULL
OR pending_admin_price_override NOT NULL
OR pending_price_type        NOT NULL
OR pending_location_address  NOT NULL
OR pending_provider_id       NOT NULL
OR pending_block_type        NOT NULL
OR pending_override_people   NOT NULL
```

Hiermee kan geen pending wijziging meer "vergeten" worden — als het in de DB staat, wordt het gepubliceerd.

### 2. Defensieve autosave in `src/lib/partialItemSave.ts`

`savePartialItemField` schrijft nu `pending_changed_at = now` of `null` op basis van een berekening uit de zojuist gelezen DB-state. Vereenvoudigen: als de nieuwe `pendingValue` niet null is, **altijd** `pending_changed_at = now` zetten. Alleen als de nieuwe waarde null is **én** er geen andere pending-velden meer openstaan, mag `pending_changed_at` terug naar null. Dat sluit de race uit.

### 3. Eenmalige herstelactie voor het huidige item

Migration die alle items met openstaande pending-data maar ontbrekende `pending_changed_at` herstelt, zodat de eerstvolgende publish ze meeneemt:

```sql
UPDATE public.program_request_items
SET pending_changed_at = now()
WHERE pending_changed_at IS NULL
  AND (
    pending_block_name IS NOT NULL
    OR pending_admin_price_notes IS NOT NULL
    OR pending_customer_notes IS NOT NULL
    OR pending_partner_instructions IS NOT NULL
    OR pending_preferred_time IS NOT NULL
    OR pending_day_index IS NOT NULL
    OR pending_admin_price_override IS NOT NULL
    OR pending_price_type IS NOT NULL
    OR pending_location_address IS NOT NULL
    OR pending_provider_id IS NOT NULL
    OR pending_block_type IS NOT NULL
    OR pending_override_people IS NOT NULL
    OR pending_marked_for_removal = true
    OR pending_added = true
  );
```

Daarna kunt u in de admin gewoon nogmaals op **Publiceer & verstuur** klikken — de instructie voor Zuiver gaat dan alsnog mee en wordt zichtbaar in de partneromgeving.

## Files

- `supabase/functions/publish-program-changes/index.ts` — filter uitbreiden
- `src/lib/partialItemSave.ts` — `pending_changed_at` altijd zetten bij niet-null pending-waarde
- Migration (eenmalig herstel) — geen schemawijziging, alleen data-fix

## Verificatie

1. Na deploy: SQL-check `SELECT id, pending_changed_at, pending_partner_instructions FROM program_request_items WHERE id = '9e53bd28-…'` → `pending_changed_at` moet gezet zijn.
2. In admin op publiceren klikken → `program_change_log` krijgt een nieuwe rij `field='partner_instructions'`.
3. In `/partner/project/5a5719d2…?impersonate=zuiver` moet de gele "Instructie van Bureau Vlieland"-banner verschijnen onder "Lunch op locatie".

Niet aangeraakt: partner-portal rendering (werkt correct) en AdminEditActivitySheet (de Opslaan-flow zet `pending_changed_at` al goed).
