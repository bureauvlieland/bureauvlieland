

# Logiesoffertes bekijken vanuit Admin detail pagina

## Wat er nu is
De admin detailpagina (`/admin/logies/:id`) toont een tabel met ontvangen offertes, maar je kunt alleen basisinformatie zien (partner, prijs, status). Er is geen manier om de volledige offertedetails te bekijken (kamerconfiguratie, extra's, beschrijving, voorwaarden, partner notities, bijlagen).

## Wat er verandert
Elke offerte-rij in de tabel krijgt een **"Bekijken"** knop (oog-icoon) die een detailsheet opent met alle offerte-informatie.

### Nieuw bestand: `src/components/admin/AdminAccommodationQuoteSheet.tsx`
Een Sheet-component specifiek voor de admin context, gebaseerd op het bestaande `AccommodationQuoteDetailSheet` patroon maar met admin-specifieke informatie:
- Prijs totaal + prijs p.p.p.n.
- Kamerconfiguratie (type, aantal, prijs per nacht, bezetting)
- Extra's (via `useQuoteExtras` hook)
- Inbegrepen items
- Beschrijving en voorwaarden
- Partner notities
- Offerte bijlage / externe link
- Geldigheid
- Status badge
- Commissie-informatie (percentage, bedrag, status) -- admin-only info
- Facturatiegegevens (gefactureerd bedrag, datum, nummer) -- admin-only info
- Doorgestuurd-status en datum

### Wijziging: `src/pages/admin/AdminAccommodationDetail.tsx`
- Import van de nieuwe `AdminAccommodationQuoteSheet`
- State toevoegen: `selectedQuoteForView` 
- Per offerte-rij een "Bekijken" knop toevoegen die de sheet opent
- De sheet ontvangt het request object voor context (aantal gasten, aantal nachten)

## Technische details
- Geen database-wijzigingen nodig -- alle data wordt al opgehaald
- De `useQuoteExtras` hook wordt hergebruikt voor extra's per offerte
- Het sheet toont meer informatie dan de klant-versie: commissie, facturatie, doorstuurstatus
- Geen nieuwe API-calls -- quote data komt uit de bestaande query, extras via bestaande hook
