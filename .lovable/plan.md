
# Prijsnotitie (price_adult_note) doorvoeren naar programma-items

## Probleem
Het veld "Notitie" bij bouwstenen (`price_adult_note`, bijv. "Per schip (12 personen)") wordt nergens overgenomen naar `admin_price_notes` op programma-items. In plaats daarvan wordt `short_description` of `null` gebruikt.

## Oorzaak
Er zijn drie plekken waar programma-items worden aangemaakt, en geen daarvan neemt `price_adult_note` over:

1. **Admin voegt activiteit toe** (`AdminAddActivitySheet.tsx` regel 103): initialiseert de beschrijving met `block.short_description` in plaats van `block.price_adult_note`
2. **Template toepassen** (`ApplyTemplateDialog.tsx` regel 79): zet `admin_price_notes` op `block.short_description` in plaats van `block.price_adult_note`
3. **Klant voegt activiteit toe** (`useCustomerProgram.ts` regel 421): zet `admin_price_notes` altijd op `null`

## Oplossing

### 1. AdminAddActivitySheet.tsx
Regel 103 wijzigen: bij het selecteren van een bouwsteen wordt `customDescription` gevuld met `price_adult_note` als dat bestaat, anders `short_description`.

```
setCustomDescription(block.price_adult_note || block.short_description || "");
```

### 2. ApplyTemplateDialog.tsx
Regel 79 wijzigen: `admin_price_notes` vullen met `price_adult_note` als dat bestaat, anders `short_description`.

```
admin_price_notes: block.price_adult_note || block.short_description || null,
```

### 3. useCustomerProgram.ts
Regel 421 wijzigen: `admin_price_notes` vullen met `price_adult_note` van de opgehaalde bouwsteen.

```
admin_price_notes: block.price_adult_note || null,
```

## Bestaande data
Het bestaande item "Zeehondentocht Exclusief" op programma KSHU9ndXD5Ey heeft al `admin_price_notes = null`. Dit moet handmatig worden bijgewerkt in de admin, of er kan een eenmalige database-update worden gedaan om bestaande items te verrijken.
