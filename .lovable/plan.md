
# Afbeeldingen toevoegen aan voorbeeldprogramma-kaarten

## Probleem
De 4 programmakaarten bovenaan de pagina tonen placeholder-afbeeldingen omdat het veld `image_url` in de `program_templates` tabel leeg is voor alle templates. De afbeeldingen in de tijdlijn-blokken werken wel correct.

## Oplossing (twee stappen)

### Stap 1: Fallback in de code
De `VoorbeeldprogrammaOverzicht.tsx` pagina toont nu `t.image_url || "/placeholder.svg"` als afbeelding. We voegen een fallback toe die automatisch de afbeelding van het eerste bouwblok uit het template gebruikt als er geen eigen template-afbeelding is ingesteld. Hiervoor moeten we de template-items ophalen of een slimme fallback inbouwen.

Concreet: we passen de `usePublishedTemplates` hook aan zodat die ook het eerste item met blok-afbeelding meelevert, of we lossen het op door voor elk template de eerste blok-image als fallback te gebruiken via een extra query.

### Stap 2: Database vullen met passende afbeeldingen
We stellen voor elk template een passende `image_url` in op basis van een representatieve bouwsteen-afbeelding die al in storage staat:

| Template | Voorgestelde afbeelding |
|---|---|
| Eilanddag Compleet | Zeehondentocht (seal-tour) of Fietshuur (cycling-team) |
| Avontuur en Ontspanning | Branding Raften of Strand BBQ |
| Complete Eilandervaring | Strandspektakel of een landschap |
| Actief en Culinair Dagje | Powerkiten/Vliegeren of Brouwerij Fortuna |

We gebruiken afbeeldingen die al beschikbaar zijn in de storage bucket `building-block-images`.

## Technische details

**Bestanden:**
- `src/hooks/useProgramTemplates.ts` — eventueel aanpassen als fallback in code gewenst is
- `src/pages/VoorbeeldprogrammaOverzicht.tsx` — fallback-logica toevoegen bij `img src`
- Database update — `image_url` vullen voor alle 4 templates

**Database updates (4 SQL statements):**
```sql
UPDATE program_templates SET image_url = '<storage-url>' WHERE id = 'eilanddag-compleet';
UPDATE program_templates SET image_url = '<storage-url>' WHERE id = 'avontuur-ontspanning';
UPDATE program_templates SET image_url = '<storage-url>' WHERE id = 'complete-eilandervaring';
UPDATE program_templates SET image_url = '<storage-url>' WHERE id = 'actief-culinair-dagje';
```

De exacte URLs worden opgehaald uit de bestaande `building_blocks` afbeeldingen.
