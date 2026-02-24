
# Template afbeelding beheerbaar maken

## Probleem
- De templates "Relax & Enjoy Vlieland" en "Katalys" hebben geen afbeelding
- In de admin template-editor (AdminTemplateSheet) ontbreekt een invoerveld voor de afbeelding, ondanks dat het veld wel in het formulier-schema zit
- Beheerders kunnen dus geen afbeelding instellen of wijzigen

## Oplossing
Een afbeeldingsveld toevoegen aan de "Algemeen" tab van de template-editor, met twee opties:
1. Een URL-invoerveld (voor directe links, bijv. uit de media-bibliotheek)
2. Een "Kies uit mediabibliotheek" knop die de bestaande MediaPickerDialog opent

## Technische aanpak

### Bestand: `src/components/admin/AdminTemplateSheet.tsx`

Toevoegen van een `image_url` FormField in de "Algemeen" tab (na het beschrijving-veld, rond regel 428):

- Een tekstveld voor de URL
- Een preview van de huidige afbeelding (als er een URL is ingevuld)
- Een knop "Kies afbeelding" die de bestaande `MediaPickerDialog` opent
- Bij selectie uit de mediabibliotheek wordt de URL automatisch ingevuld

Het veld gebruikt het reeds bestaande `image_url` in het zod-schema (regel 153) en de `useUpdateTemplate` hook slaat het al op (regel 240).

### Wijzigingen samengevat

| Bestand | Actie |
|---|---|
| `src/components/admin/AdminTemplateSheet.tsx` | FormField voor `image_url` toevoegen met preview + MediaPickerDialog integratie |

### Wat niet verandert
- Database schema (kolom `image_url` bestaat al op `program_templates`)
- Form schema / hooks (ondersteunen `image_url` al)
- Fallback-logica voor templates zonder afbeelding blijft werken
