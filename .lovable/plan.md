
# Navigatie optimalisatie

## Huidige problemen
1. **Dubbele links**: "Programma samenstellen" verschijnt twee keer (tekstlink + CTA-button), "Contact" ook twee keer (tekstlink in "Over ons" dropdown + aparte button)
2. **Te veel items op de balk**: 3 dropdowns + 3 losse links + 2 buttons = 8 elementen, waardoor het logo op kleinere desktops verdwijnt
3. **Ruimtegebrek**: op 1024-1366px schermen is het erg krap

## Voorgestelde aanpak: compactere navigatie

### Wat verandert
- **Verwijder dubbele "Programma samenstellen" tekstlink** uit het midden -- de CTA-button rechts is voldoende en valt meer op
- **Verwijder losse "Contact" button** -- Contact blijft bereikbaar via het "Over ons" dropdown
- **"Voorbeeldprogramma's" verplaatsen** naar het "Voor bedrijven" dropdown als eerste item, aangezien het daar thematisch bij past
- **Resultaat**: van 8 naar 5 elementen op de balk (3 dropdowns + Logies link + 1 CTA-button)

### Visueel resultaat

```text
[Logo]   Voor bedrijven v   Voor prive v   Logies   Over ons v   [Programma samenstellen]
```

In plaats van het huidige:
```text
[Logo] Voor bedrijven v  Voor prive v  Voorbeeldprogramma's  Programma samenstellen  Logies  Over ons v  [Contact] [Programma samenstellen]
```

### Mobiel
Het mobiele menu wordt ook opgeschoond: geen dubbele "Programma samenstellen" link meer (alleen de CTA-button bovenaan).

## Technische details

**Bestand:** `src/components/Navigation.tsx`

Wijzigingen:
1. Verplaats "Voorbeeldprogramma's" naar `voorBedrijvenItems` array als eerste (niet-highlighted) item
2. Verwijder de losse `<Link to="/voorbeeldprogrammas">` en `<Link to="/programma-samenstellen">` uit de desktop nav
3. Verwijder de `<Link to="/contact"><Button>Contact</Button></Link>` button (Contact zit al in "Over ons")
4. Zelfde opschoning in de mobiele sectie: verwijder dubbele links
5. Gap tussen items iets verkleinen: `gap-5` naar `gap-4`
