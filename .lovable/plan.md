

# Partner Bouwstenen Sheet verbeteren

## Huidige situatie

De partner sheet heeft al dezelfde inhoudelijke velden als de admin (prijzen, categorie, beschrijving, etc.). De twee concrete problemen zijn:

1. **Lelijke ID-generatie**: Nieuwe partner-bouwstenen krijgen IDs als `partner-voc-vlieland-1738930000000` in plaats van leesbare slugs zoals `zeehondentocht`
2. **Form reset ontbreekt**: Na opslaan van een nieuwe bouwsteen blijft het formulier gevuld met de vorige data (zelfde bug als de admin had)

## Wat wordt aangepast

### 1. Auto-slug op basis van naam

Bij het aanmaken genereert het formulier automatisch een leesbare slug uit de naam, net als in de admin sheet. Voorbeeld: "Zeehondentocht Vlieland" wordt `zeehondentocht-vlieland`.

### 2. Form reset na opslaan

Na succesvol opslaan van een nieuw blok wordt het formulier volledig leeggemaakt, zodat direct een volgende bouwsteen kan worden toegevoegd.

## Technische details

**Bestand: `src/components/partner-portal/PartnerBlockSheet.tsx`**

- Slugify-functie toevoegen aan het `name` veld: `onChange` handler die automatisch een slug genereert
- Gegenereerde slug gebruiken als `id` bij insert (in plaats van `partner-${partnerId}-${Date.now()}`)
- Na succesvol aanmaken: `setFormData(getInitialFormData(null))` aanroepen om het formulier te resetten
- Optioneel: het slug-veld tonen als readonly info zodat de partner ziet welke ID wordt aangemaakt

Geen database-wijzigingen nodig. De admin-specifieke velden (block_type, provider_id, sort_order, status) blijven verborgen voor partners -- die worden automatisch gezet (block_type=partner, provider_id=eigen partner, status=concept via DB default).
