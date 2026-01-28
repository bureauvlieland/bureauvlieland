
# SEO Landingspagina: Logies op Vlieland

## Waarom zinvol?

Een SEO-landingspagina voor logies is zeer waardevol omdat:

1. **SEO-waarde**: Mensen zoeken op "overnachten Vlieland groep", "groepsaccommodatie Vlieland", "hotel bedrijfsuitje Vlieland"
2. **Funnel-structuur**: Net als `/bouwstenen` → `/programma-samenstellen`, creëren we `/logies-vlieland` → `/logies-aanvragen`
3. **Interne linking**: Kan linken naar én gelinkt worden vanaf andere landingspagina's
4. **Content-marketing**: Ruimte voor uitleg over accommodatietypes, locaties en proces

---

## Pagina-structuur: `/logies-vlieland`

### 1. Hero Sectie
- **Afbeelding**: Kan `vlieland-landscape.jpg` of `vlieland-morning.jpg` gebruiken (sfeervolle eilandbeelden)
- **Titel**: "Logies op Vlieland voor groepen"
- **Subtitel**: Focus op ontzorging en keuze
- **CTA**: "Vraag logies aan" → `/logies-aanvragen`

### 2. Inleiding Sectie
- Uitleg over de unieke positie van Bureau Vlieland als lokale bemiddelaar
- Benadrukken: vrijblijvend, vergelijken, direct boeken bij de accommodatie

### 3. Accommodatietypes Grid
Vier kaarten met de types uit de database:
| Type | Icon | Beschrijving |
|------|------|-------------|
| Hotel | Building2 | Comfort en gemak in het dorp |
| Vakantiehuis | Home | Privacy voor kleinere groepen |
| Groepsaccommodatie | Users | Ideaal voor grote groepen |
| Appartement | Building | Onafhankelijk verblijf |

### 4. "Hoe werkt het?" Sectie
Visuele stappen (hergebruik van huidige wizard-uitleg):
1. Vul wensen in
2. Wij zoeken voor u
3. Vergelijk offertes
4. Boek direct

### 5. USP's / Voordelen
- **Lokale kennis**: Wij kennen alle accommodaties persoonlijk
- **Vrijblijvend**: Geen verplichtingen tot je boekt
- **Eén aanspreekpunt**: Wij regelen de communicatie
- **Gecombineerd boeken**: Link naar programma-samenstellen

### 6. Interne Links Sectie
Koppeling naar gerelateerde pagina's:
- `/bedrijfsuitje-vlieland` - Compleet bedrijfsuitje
- `/meerdaags-bedrijfsuitje-vlieland` - Meerdaags met overnachting
- `/programma-samenstellen` - Activiteiten toevoegen
- `/catering` - Eten en drinken

### 7. CTA Sectie
Geharmoniseerde CTA's:
- Primair: "Vraag logies aan" → `/logies-aanvragen`
- Secundair: "Liever persoonlijk advies?" → `/contact`

### 8. Structured Data
Hergebruik `LandingPageStructuredData` component voor:
- Service schema (Accommodation Services)
- BreadcrumbList schema

---

## Technische Implementatie

### Nieuw bestand
```
src/pages/LogiesVlieland.tsx
```

### Route toevoegen in App.tsx
```tsx
<Route path="/logies-vlieland" element={<LogiesVlieland />} />
```

### Navigatie aanpassen
```tsx
// Link "Logies" verandert van /logies-aanvragen naar /logies-vlieland
// De landingspagina bevat dan de link naar de wizard
```

### Interne links toevoegen
Update deze pagina's met links naar `/logies-vlieland`:
- `BedrijfsuitjeVlieland.tsx`
- `MeerdaagsBedrijfsuitjeVlieland.tsx`
- `Voorbeeldprogrammas.tsx`

### Sitemap bijwerken
```xml
<url>
  <loc>https://bureauvlieland.nl/logies-vlieland</loc>
  <priority>0.8</priority>
</url>
```

---

## SEO Metadata

```tsx
<Helmet>
  <title>Logies op Vlieland voor groepen | Bureau Vlieland</title>
  <meta 
    name="description" 
    content="Zoek en vergelijk groepsaccommodaties op Vlieland. Hotels, vakantiehuizen en groepsverblijven - wij regelen de offertes, jij kiest." 
  />
  <link rel="canonical" href="https://bureauvlieland.nl/logies-vlieland" />
</Helmet>
```

---

## Afbeeldingen

Beschikbare opties voor hero-afbeelding:
- `vlieland-landscape.jpg` - Eilandlandschap
- `vlieland-morning.jpg` - Ochtendsfeer
- `vlieland-beach.jpg` - Strandbeeld

Voor de accommodatietype-kaarten kunnen we iconen gebruiken (geen specifieke accommodatiefoto's beschikbaar).

---

## Geschatte Bestandslijst

| Bestand | Actie |
|---------|-------|
| `src/pages/LogiesVlieland.tsx` | Nieuw - SEO landingspagina |
| `src/App.tsx` | Route toevoegen |
| `src/components/Navigation.tsx` | Link aanpassen naar landingspagina |
| `src/pages/BedrijfsuitjeVlieland.tsx` | Interne link toevoegen |
| `src/pages/MeerdaagsBedrijfsuitjeVlieland.tsx` | Interne link toevoegen |
| `src/pages/Voorbeeldprogrammas.tsx` | Interne link toevoegen |
| `public/sitemap.xml` | URL toevoegen |

