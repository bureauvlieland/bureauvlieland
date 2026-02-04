

# Opmaak Verbetering: Coming Soon Pagina

## Huidige Problemen

De `/binnenkort` pagina heeft enkele styling inconsistenties:

1. **Header padding**: De header padding is kleiner dan standaard (`py-4` vs typisch `py-5` of `py-6`)
2. **Content sectie**: Ontbreekt verticale padding waardoor de content tegen de header/footer aan kan komen
3. **Content container**: Geen `max-w-7xl` en inconsistente container styling
4. **Mobile spacing**: De `px-4` op main is te krap, zou moeten matchen met de rest van de site

---

## Verbeteringen

### Header
- Padding verhogen naar `py-5` voor betere verticale ruimte
- Container styling consistent maken met Footer (`max-w-7xl`)

### Content Sectie
- Verticale padding toevoegen (`py-16 md:py-24`) voor ademruimte
- Container uitbreiden met `sm:px-6 lg:px-8 max-w-7xl`
- Card-achtige achtergrond toevoegen voor meer visuele structuur

### Knoppen
- `w-full sm:w-auto` toevoegen zodat knoppen op mobile de volle breedte pakken
- Spacing verbeteren tussen icon en tekst

---

## Technische Wijzigingen

### `src/pages/ComingSoon.tsx`

```tsx
// Header - betere padding en container
<header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-5 flex items-center justify-between">
    ...
  </div>
</header>

// Main - meer verticale ruimte en betere container
<main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 md:py-24">
  <div className="text-center max-w-lg w-full">
    // Icon cirkel iets groter
    <div className="mb-8 flex justify-center">
      <div className="rounded-full bg-primary/10 p-8">
        <Construction className="h-16 w-16 text-primary" />
      </div>
    </div>
    
    // Titel met meer spacing
    <h1 className="text-3xl md:text-4xl font-bold mb-6">...</h1>
    
    // Paragraph met meer margin
    <p className="text-muted-foreground text-lg mb-10 leading-relaxed">...</p>

    // Buttons met betere mobile styling
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Button className="w-full sm:w-auto">...</Button>
    </div>
  </div>
</main>
```

---

## Visueel Resultaat

| Element | Was | Wordt |
|---------|-----|-------|
| Header padding | `py-4` | `py-5` |
| Content padding | `px-4` | `px-4 sm:px-6 lg:px-8 py-16 md:py-24` |
| Icon container | `p-6`, `h-12 w-12` | `p-8`, `h-16 w-16` |
| Titel | `text-3xl mb-4` | `text-3xl md:text-4xl mb-6` |
| Paragraaf | `mb-8` | `text-lg mb-10` |
| Button gap | `gap-3` | `gap-4` |
| Buttons mobile | default | `w-full sm:w-auto` |
| Max width content | `max-w-md` | `max-w-lg` |

---

## Te Wijzigen Bestanden

| Bestand | Actie |
|---------|-------|
| `src/pages/ComingSoon.tsx` | Styling aanpassen voor betere padding, margin en responsive gedrag |

