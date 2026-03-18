

## Probleem

Bij het aanmaken van programma-items via de AI-assistent en het toepassen van templates wordt `admin_price_notes` gevuld met `block.price_adult_note || block.short_description`. Omdat `price_adult_note` voorrang krijgt, eindigt de beschrijving op "p.p." in plaats van de daadwerkelijke `short_description` van de bouwsteen.

## Wijzigingen

### 1. `src/components/admin/AdminAiProgramDialog.tsx` (regel 163)
Draai de prioriteit om: gebruik `short_description` als eerste keuze, `price_adult_note` als fallback.

```typescript
// Was:
admin_price_notes: block.price_adult_note || block.short_description || null,
// Wordt:
admin_price_notes: block.short_description || block.price_adult_note || null,
```

### 2. `src/components/admin/ApplyTemplateDialog.tsx` (regel 79)
Zelfde aanpassing:

```typescript
// Was:
admin_price_notes: block.price_adult_note || block.short_description || null,
// Wordt:
admin_price_notes: block.short_description || block.price_adult_note || null,
```

### 3. `src/components/admin/AdminAddActivitySheet.tsx` (regel 120)
Al correct — gebruikt `block.short_description || ""`. Geen wijziging nodig.

### Impact
- Nieuwe items krijgen de bouwsteen-beschrijving als standaard in het "Beschrijving voor klant" veld
- Bestaande items met "p.p." moeten handmatig worden gecorrigeerd (de data in de database verandert niet automatisch)

