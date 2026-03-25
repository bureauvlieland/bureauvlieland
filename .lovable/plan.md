

## Plan: Admin-banner tekst corrigeren

### Probleem
De banner in de admin detailpagina zegt: *"De klant ziet het programma als 'In behandeling'. Na publicatie worden items zichtbaar."* — maar items zijn al wél zichtbaar voor de klant (in read-only modus). De tekst is dus misleidend.

### Aanpassing

**Bestand**: `src/pages/admin/AdminRequestDetail.tsx` (regel 1172-1177)

De twee regels tekst in de concept-banner aanpassen naar:

- **Titel**: "Programma nog niet gepubliceerd als offerte"
- **Subtekst**: "De klant kan het programma al bekijken, maar kan nog geen akkoord geven. Publiceer het programma om een offerte naar de klant te sturen."

Dit reflecteert correct de huidige werking: items zijn zichtbaar maar read-only, en publiceren schakelt de offerte-flow in.

### Geen verdere wijzigingen
- Geen database-migraties
- Geen wijzigingen in klantportaal-logica (huidige read-only gedrag blijft)

