

# SEO & kwaliteitsverbeteringen doorvoeren

## Overzicht

Zes concrete verbeteringen die samen de technische SEO, structured data en gebruikerservaring verbeteren.

---

## 1. HTML-taal van "en" naar "nl"

Het `<html lang="en">` in `index.html` wordt gewijzigd naar `<html lang="nl">`. Dit helpt zoekmachines en screenreaders de taal correct herkennen.

## 2. Adres consistent maken (Sikkelduin 11)

`LandingPageStructuredData.tsx` bevat een fout adres ("Dorpsstraat 99, Oost-Vlieland, 8899 AB"). Dit wordt gecorrigeerd naar het juiste adres dat al in `StructuredData.tsx` en `Footer.tsx` staat:
- Sikkelduin 11
- 8899 CG Vlieland

## 3. Ongeldig Event-schema verwijderen

Het `Event`-schema in `StructuredData.tsx` mist verplichte velden (`startDate`, `endDate`) en is niet geldig. Dit schema wordt volledig verwijderd. De overige schemas (LocalBusiness, Services, Reviews) blijven staan.

## 4. Open Graph & Twitter meta-tags toevoegen aan landingspagina's

De volgende pagina's missen `og:title`, `og:description` en `og:image` tags:
- BedrijfsuitjeVlieland
- TeamuitjeVlieland
- HeisessieVlieland
- MeerdaagsBedrijfsuitjeVlieland
- ZakelijkEvenementVlieland
- BedrijfsuitjeIdeeenVlieland
- IncentiveReisVlieland
- LogiesVlieland
- Catering
- Diensten
- Contact
- Evenementen
- ProgrammaSamenstellen

Voor elke pagina wordt binnen de bestaande `<Helmet>` de `og:title`, `og:description`, `og:image` en `og:url` toegevoegd (op basis van de al aanwezige title en description). De pagina's die dit al hebben (TrouwenOpVlieland, GroepsweekendVlieland, JubileumVlieland, FamilieweekendVlieland, OverOns) worden overgeslagen.

## 5. 404-pagina: noindex meta-tag

De `NotFound.tsx` pagina krijgt een `<Helmet>` met `<meta name="robots" content="noindex, nofollow" />` zodat 404-pagina's niet worden geindexeerd.

## 6. Hero-afbeelding homepage: fetchpriority="high"

De hero-afbeelding in `Hero.tsx` krijgt `fetchpriority="high"` en `loading="eager"` voor betere LCP-score (Largest Contentful Paint).

---

## Technische details

### `index.html`
- Regel 2: `lang="en"` wordt `lang="nl"`

### `src/components/LandingPageStructuredData.tsx`
- Regels 33-37: Adres wijzigen naar Sikkelduin 11, 8899 CG, Vlieland

### `src/components/StructuredData.tsx`
- Regels 144-166: Volledig Event-schema verwijderen
- Regel 169: Event uit de schemas-array verwijderen

### `src/components/Hero.tsx`
- `fetchpriority="high"` en `loading="eager"` toevoegen aan de hero `<img>` tag

### `src/pages/NotFound.tsx`
- `Helmet` importeren en `<meta name="robots" content="noindex, nofollow" />` toevoegen

### Landingspagina's (13 bestanden)
Per pagina worden binnen de bestaande `<Helmet>` de volgende tags toegevoegd:
```
<meta property="og:title" content="[bestaande title]" />
<meta property="og:description" content="[bestaande description]" />
<meta property="og:image" content="https://bureauvlieland.nl/og-image.png" />
<meta property="og:url" content="https://bureauvlieland.nl/[pad]" />
<meta property="og:type" content="website" />
```

