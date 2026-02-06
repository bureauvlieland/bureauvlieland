
# Activiteiten toevoegen voor alle programma-typen

## Probleem
De knop "Activiteit toevoegen" is momenteel alleen zichtbaar bij programma's van het type `quote` (maatwerk). Bij programma's die zijn aangemaakt via een logiesaanvraag (self-service), ontbreekt deze knop. Hierdoor kan een admin geen activiteiten toevoegen aan het programma van Jack Frieling.

## Oplossing
De conditie `{isQuoteMode && (...)}` rondom de "Activiteit toevoegen" knop verwijderen, zodat de knop altijd beschikbaar is voor admins -- ongeacht het programma-type.

## Technische details

### Bestand: `src/pages/admin/AdminRequestDetail.tsx`

**Wijziging 1 -- Knop altijd tonen (regel 856-861)**

De huidige code:
```tsx
{isQuoteMode && (
  <Button onClick={() => setAddActivityOpen(true)}>
    <Plus className="h-4 w-4 mr-2" />
    Activiteit toevoegen
  </Button>
)}
```

Wordt:
```tsx
<Button onClick={() => setAddActivityOpen(true)}>
  <Plus className="h-4 w-4 mr-2" />
  Activiteit toevoegen
</Button>
```

Dit is een minimale wijziging van 1 regel conditie verwijderen. De `AdminAddActivitySheet` component en alle onderliggende logica (opslaan naar database, koppelen aan request) werken al generiek en zijn niet afhankelijk van het programma-type.
