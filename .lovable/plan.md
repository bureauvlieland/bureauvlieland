

# Plan: Sitemap.xml Bijwerken voor B2B Landingspagina's

## Samenvatting
De sitemap.xml wordt geactualiseerd met alle ontbrekende publieke landingspagina's en de lastmod datums worden bijgewerkt naar de huidige datum.

---

## Wijzigingen

### Nieuwe URL's toevoegen

| URL | Priority | Changefreq | Categorie |
|-----|----------|------------|-----------|
| `/bedrijfsuitje-ideeen-vlieland` | 0.8 | monthly | B2B |
| `/groepsweekend-vlieland` | 0.8 | monthly | B2C |
| `/jubileum-vlieland` | 0.8 | monthly | B2C |
| `/familieweekend-vlieland` | 0.8 | monthly | B2C |
| `/programma-samenstellen` | 0.9 | weekly | Conversie |
| `/logies-aanvragen` | 0.8 | monthly | Conversie |

### Lastmod datums actualiseren
Alle bestaande URL's krijgen `lastmod` bijgewerkt naar **2026-02-04** (vandaag).

### Priority structuur
- **1.0**: Homepage
- **0.9**: Hoofddiensten (diensten, samenwerken, bouwstenen, bedrijfsuitje-vlieland, programma-samenstellen)
- **0.8**: Landingspagina's (alle specifieke event-types)
- **0.7**: Contact & offerte pagina's
- **0.6**: Over ons
- **0.3**: Juridisch (algemene voorwaarden)

---

## Pagina's die NIET worden toegevoegd (geen SEO-waarde)
- `/partner/*` - Partnerportaal (niet-publiek)
- `/admin/*` - Adminpaneel (niet-publiek)
- `/mijn-programma/*` - Klantportaal (token-based)
- `/programma/:shareCode` - Gedeelde programma's (dynamisch)
- `/binnenkort` - Tijdelijke pagina

---

## Technische details

**Bestand:** `public/sitemap.xml`

De sitemap wordt gestructureerd met URL's gegroepeerd op:
1. Hoofdpagina's
2. B2B landingspagina's (bedrijfsuitje hub + spokes)
3. B2C landingspagina's (privé events)
4. Conversie pagina's
5. Ondersteunende pagina's

