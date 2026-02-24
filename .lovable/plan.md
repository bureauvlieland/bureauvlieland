

# Navigatie, links en footer optimalisatie voor conversie

## Bevindingen

### Hoofdnavigatie -- huidige situatie
- "Voorbeeldprogramma's" staat zowel in het dropdown "Voor bedrijven" als standalone link -- dubbel
- "Logies" heeft een standalone link, maar is een niche-pagina voor een navigatiebalk
- "Catering" ontbreekt in de navigatie, terwijl het een populaire dienst is
- CTA-knop "Programma samenstellen" is goed maar kan sterker qua tekst en styling
- "Voor bedrijven" is visueel prominenter (font-semibold, text-foreground) dan "Voor prive & trouwen" (text-muted-foreground) -- dit is goed voor de zakelijke focus

### Footer -- huidige situatie
- "Maatwerk aanvragen" linkt naar /contact -- beter naar /programma-samenstellen (maatwerk track)
- Kolom 4 "Direct aan de slag" bevat goede links maar kan conversiegericht verbeterd worden

### CTA-inconsistenties op landingspagina's
- Sommige pagina's linken secundaire CTA naar `/contact`, andere naar `/offerte`
- `/offerte` is een apart formulier dat grotendeels overlapt met de "Laten regelen" track in de configurator
- Labels wisselen: "Liever persoonlijk advies?" vs "Maatwerk aanvragen" vs "Maatwerkofferte aanvragen"

## Plan

### 1. Hoofdnavigatie aanpassen

**Verwijderen:**
- Standalone link "Voorbeeldprogramma's" (staat al in dropdown)
- Standalone link "Logies" (verplaatsen naar dropdown of footer-only)

**Toevoegen/wijzigen:**
- "Diensten" als direct link (verwijst naar /diensten)
- "Catering" als direct link (populaire pagina)
- CTA-knop tekst wijzigen naar "Gratis programma samenstellen" of "Start uw programma" voor meer urgentie

**Nieuwe structuur desktop:**
```text
[Logo]  Voor bedrijven v  Voor prive v  Diensten  Catering  Over ons v  [CTA: Start uw programma]
```

**Mobile:** CTA bovenaan behouden, zelfde structuurwijzigingen

### 2. Footer aanpassen

- "Maatwerk aanvragen" link wijzigen van `/contact` naar `/programma-samenstellen`
- "Logies regelen" link laten staan (footer is de juiste plek)

### 3. CTA-links op landingspagina's uniformeren

Alle secundaire CTA's ("Maatwerk aanvragen" / "Liever persoonlijk advies?") verwijzen naar `/programma-samenstellen` in plaats van naar `/contact` of `/offerte`. De configurator biedt immers al de "Laten regelen" maatwerk-track.

Betreft de volgende bestanden:
- `Diensten.tsx`: `/offerte` wordt `/programma-samenstellen`
- `BedrijfsuitjeVlieland.tsx`: `/contact` wordt `/programma-samenstellen`, label "Liever maatwerk?" 
- `HeisessieVlieland.tsx`: `/contact` wordt `/programma-samenstellen`
- `ZakelijkEvenementVlieland.tsx`: `/contact` wordt `/programma-samenstellen`
- `FamilieweekendVlieland.tsx`: `/contact` wordt `/programma-samenstellen`
- `IncentiveReisVlieland.tsx`: idem
- `ForWho.tsx`: `/offerte` wordt `/programma-samenstellen`
- `Index.tsx`: "Bekijk onze diensten" secundaire CTA blijft, primaire CTA tekst consistent maken
- `LogiesVlieland.tsx`: `/contact` CTA wordt `/programma-samenstellen`

Label uniformeren naar: **"Liever maatwerk?"** of **"Maatwerk aanvragen"** (consistent op alle pagina's)

## Technisch overzicht

| Bestand | Wijziging |
|---|---|
| `src/components/Navigation.tsx` | Verwijder dubbele standalone links, voeg Diensten en Catering toe, CTA-tekst aanpassen |
| `src/components/Footer.tsx` | "Maatwerk aanvragen" link naar /programma-samenstellen |
| `src/pages/Diensten.tsx` | Secundaire CTA /offerte naar /programma-samenstellen |
| `src/pages/BedrijfsuitjeVlieland.tsx` | Secundaire CTA /contact naar /programma-samenstellen |
| `src/pages/HeisessieVlieland.tsx` | Idem |
| `src/pages/ZakelijkEvenementVlieland.tsx` | Idem |
| `src/pages/FamilieweekendVlieland.tsx` | Idem |
| `src/pages/IncentiveReisVlieland.tsx` | Idem |
| `src/pages/LogiesVlieland.tsx` | Idem |
| `src/components/ForWho.tsx` | /offerte naar /programma-samenstellen |
| `src/pages/Index.tsx` | CTA-tekst consistent maken |

## Wat niet verandert
- De /offerte en /contact pagina's zelf blijven bestaan (direct bereikbaar, SEO-waarde)
- Admin, partner-portal, customer-portal navigatie
- Dropdown-inhoud "Voor bedrijven" en "Voor prive & trouwen"
- Footer-structuur (kolommen, externe links)
