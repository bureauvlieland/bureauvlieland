
# Standaardvoorwaarden Partneraanbod Webpagina

## Samenvatting
Een nieuwe webpagina toevoegen voor de Standaardvoorwaarden Partneraanbod en alle verwijzingen naar de PDF bijwerken naar deze nieuwe pagina. Dit zorgt ervoor dat de voorwaarden direct op de website bekeken kunnen worden in plaats van een PDF te moeten downloaden.

## Huidige situatie
- De standaard partnervoorwaarden verwijzen nu naar een PDF: `partner-terms/default/standaard-partnervoorwaarden.pdf`
- Deze PDF wordt gerefereerd in 4 bestanden:
  - `AcceptTermsCard.tsx` - Checkout voorwaarden klantportaal
  - `AcceptedTermsCard.tsx` - Na acceptatie zichtbaar
  - `PartnerTermsUpload.tsx` - Partner instellingen
  - `update-customer-program` Edge Function - Logging

## Wat er gaat gebeuren

### 1. Nieuwe webpagina aanmaken
**Bestand:** `src/pages/PartnerTerms.tsx`
- Dezelfde structuur als de huidige `Terms.tsx` (Algemene Voorwaarden)
- Navigatie + Footer componenten
- "Terug" knop
- Nette opmaak met dezelfde styling als de bestaande voorwaardenpagina
- Alle 10 artikelen van de tekst die je hebt aangeleverd

### 2. Route toevoegen
**Bestand:** `src/App.tsx`
- Nieuwe route: `/partner-voorwaarden`
- De pagina wordt publiek toegankelijk (geen login vereist)

### 3. Alle verwijzingen bijwerken
De `DEFAULT_TERMS_URL` in de volgende bestanden wordt gewijzigd van de PDF-link naar `/partner-voorwaarden`:

| Bestand | Wijziging |
|---------|-----------|
| `AcceptTermsCard.tsx` | "Download PDF" → "Bekijken" met link naar webpagina |
| `AcceptedTermsCard.tsx` | "Download PDF" → "Bekijken" met link naar webpagina |
| `PartnerTermsUpload.tsx` | Link naar webpagina in plaats van PDF |

### 4. Redirect toevoegen (optioneel)
**Bestand:** `public/_redirects`
- Eventueel een redirect van de oude PDF-path naar de nieuwe pagina voor bestaande links

## Technische details

```text
Nieuwe bestandsstructuur:
├── src/pages/
│   ├── Terms.tsx                 (bestaand - Algemene Voorwaarden Bureau Vlieland)
│   └── PartnerTerms.tsx          (nieuw - Standaardvoorwaarden Partneraanbod)

Routing:
/algemene-voorwaarden  →  Terms.tsx (bestaand)
/partner-voorwaarden   →  PartnerTerms.tsx (nieuw)
```

## Voorbeeld code snippets

**Nieuwe pagina header:**
```tsx
<h1>Standaardvoorwaarden Partneraanbod</h1>
<p className="text-muted-foreground">
  Van toepassing indien Partner geen eigen algemene voorwaarden 
  heeft gepubliceerd via het platform van Bureau Vlieland
</p>
```

**Bijgewerkte link in AcceptTermsCard:**
```tsx
// Was:
onClick={() => window.open(DEFAULT_TERMS_URL, "_blank")}

// Wordt:
onClick={() => window.open("/partner-voorwaarden", "_blank")}
```

## Voordelen van deze aanpak
- Voorwaarden zijn doorzoekbaar en indexeerbaar door zoekmachines
- Sneller laden dan een PDF
- Consistent met de bestaande "Algemene Voorwaarden" pagina
- Makkelijker te onderhouden (tekst direct in de code)
- Toegankelijker voor alle gebruikers
