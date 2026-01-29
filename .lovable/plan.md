
# Plan: Pagina "Programma samenstellen" Herpositionering

## Samenvatting
De pagina wordt getransformeerd van een "speelse zelfbouw-tool" naar een "professionele programma samenstellen met begeleiding" ervaring, terwijl de eenvoud en self-service behouden blijft.

---

## Deel 1: Hero Sectie Aanpassingen

### 1.1 Headline en Subregel Wijzigen
**Bestand**: `src/pages/ProgrammaSamenstellen.tsx`

**Huidige tekst:**
```
"Bouw je eigen programma in 5 minuten"
"Selecteer je favoriete bouwstenen, kies je datum en groepsgrootte..."
```

**Nieuwe tekst:**
```
Stel uw programma op Vlieland samen

Kies activiteiten, catering en vervoer voor uw groep.
Wij controleren beschikbaarheid en zorgen dat alles goed op elkaar aansluit.
Bij meerdaagse verblijven kunnen wij ook passende logies voor uw groep verzorgen.
```

### 1.2 Positioneringszin Toevoegen
Onder de subregel een extra zin:
```
Activiteiten worden uitgevoerd door zorgvuldig geselecteerde lokale partners.
```

---

## Deel 2: "Zo werkt het" Blok

### 2.1 Nieuw Component Maken
**Nieuw bestand**: `src/components/configurator/HowItWorksBlock.tsx`

Compact blok met 6 stappen in horizontale layout:

```text
┌────────────────────────────────────────────────────────────────────────────────────┐
│                              Zo werkt het                                          │
├────────────────────────────────────────────────────────────────────────────────────┤
│  1. Kies wat past    2. Meerdere dagen?    3. Beschikbaarheid    4. Bevestiging   │
│     bij uw groep        Wij regelen logies     controleren           per onderdeel│
│                                                                                    │
│  5. Directe                6. Wij bewaken het                                      │
│     facturering              totaaloverzicht                                       │
└────────────────────────────────────────────────────────────────────────────────────┘
```

**Kenmerken:**
- Visueel rustig, geen waarschuwingen
- Geen juridische tekst
- Subtiele iconen per stap (optioneel)
- Responsive: 3x2 grid op desktop, verticale lijst op mobiel

---

## Deel 3: Ondersteunings-CTA

### 3.1 Contact Balk Toevoegen
**Locatie**: Rechts boven de onderdelen-grid in `ProgrammaSamenstellen.tsx`

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Kies uw onderdelen                                                      │
│                                             Twijfelt u over de juiste   │
│                                             opzet? Wij denken graag     │
│ [Categorie filters]                         met u mee. [Neem contact op]│
└─────────────────────────────────────────────────────────────────────────┘
```

**Styling:**
- Klein, niet dominant
- Text in muted-foreground kleur
- Knop als ghost of link variant

---

## Deel 4: Groepsgrootte Context

### 4.1 Minimum Groepsgrootte Indicator
**Locatie**: Boven de grid, onder de categorie filters

```
Geschikt voor groepen vanaf 8 personen.
```

Of dynamisch gebaseerd op `numberOfPeople` in de cart:
- Onder 8: toon waarschuwing
- 8+: toon neutrale bevestiging

---

## Deel 5: Meerdaags Verblijf Banner

### 5.1 Nieuw Component: LogiesSuggestionBanner
**Nieuw bestand**: `src/components/configurator/LogiesSuggestionBanner.tsx`

Wanneer gebruiker meerdere dagen selecteert (`selectedDates.length > 1`):

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 🛏️  Meerdaags verblijf geselecteerd                                     │
│                                                                         │
│ Wilt u dat wij ook passende logies voor uw groep regelen?               │
│                                               [Logies laten regelen]    │
└─────────────────────────────────────────────────────────────────────────┘
```

**Kenmerken:**
- Geen blokkade, geen verplichting
- Subtiele achtergrondkleur (muted)
- Knop linkt naar `/logies-aanvragen`
- Alleen tonen wanneer `selectedDates.length > 1`

---

## Deel 6: Terminologie Consistentie

### 6.1 Vervang "Bouwstenen" door "Onderdelen"

**Bestanden om aan te passen:**
- `src/pages/ProgrammaSamenstellen.tsx`:
  - "Kies je bouwstenen" → "Kies uw onderdelen"
  - "Voeg eerst bouwstenen toe" → "Voeg eerst onderdelen toe"
  - "Bouwstenen laden..." → "Onderdelen laden..."
  - "Terug naar bouwstenen overzicht" → "Terug naar onderdelen"

- `src/components/configurator/GlobalCartDrawer.tsx`:
  - "Voeg eerst bouwstenen toe" → "Voeg eerst onderdelen toe"

- `src/components/configurator/BuildingBlockCard.tsx`:
  - Geen tekstuele wijzigingen nodig (toont naam van block)

- `src/components/configurator/ConfiguratorCart.tsx`:
  - "Voeg bouwstenen toe" → "Voeg onderdelen toe"

---

## Deel 7: UX Verbetering bij Toevoegen

### 7.1 Subtiele Toast Bevestiging
**Bestand**: `src/pages/ProgrammaSamenstellen.tsx` of `CartContext.tsx`

Bij toevoegen aan programma:
```typescript
toast({
  title: "Toegevoegd aan uw programma",
  description: block.name,
  duration: 2000,
});
```

**Huidige implementatie review:**
- Er is al een `itemJustAdded` state die een animatie triggert op de floating button
- Dit is subtiel en niet verstorend - behouden
- Toevoegen: korte toast bevestiging

---

## Deel 8: Verwijderen Juridische/Facturatie Info

### 8.1 Info Banner Aanpassen
**Bestand**: `src/pages/ProgrammaSamenstellen.tsx`

Huidige tekst in info-banner bevat:
- "Je aanvraag is vrijblijvend – je betaalt pas na bevestiging"

Dit verwijderen uit hero. Het "Zo werkt het" blok vervangt de huidige `<Info>` banner.

**Verwijder volledig:**
```tsx
{/* Info banner */}
<div className="bg-muted/50 border border-border rounded-lg p-4 mb-8 flex items-start gap-3">
  ...
</div>
```

---

## Deel 9: Tone of Voice Aanpassingen

### 9.1 Alle teksten formeel maken

**Wijzigingen:**
| Huidige tekst | Nieuwe tekst |
|---------------|--------------|
| "je programma" | "uw programma" |
| "je datum" | "uw datum" |
| "je gegevens" | "uw gegevens" |
| "Je programma is nog leeg" | "Uw programma is nog leeg" |
| "Voeg bouwstenen toe om te beginnen" | "Voeg onderdelen toe om te beginnen" |
| "Start met samenstellen" | "Start met samenstellen" (behouden) |

### 9.2 Geen uitroeptekens
Alle teksten doorlopen en uitroeptekens verwijderen waar aanwezig.

---

## Technische Implementatie

### Nieuwe Bestanden

1. **`src/components/configurator/HowItWorksBlock.tsx`**
   - Compact 6-stappen blok
   - Responsive grid layout
   - Geen state nodig

2. **`src/components/configurator/LogiesSuggestionBanner.tsx`**
   - Props: `isVisible: boolean`, `onNavigate?: () => void`
   - Link naar `/logies-aanvragen`

3. **`src/components/configurator/SupportCTA.tsx`**
   - Kleine ondersteunings-call
   - Link naar `/contact`

### Aan te Passen Bestanden

1. **`src/pages/ProgrammaSamenstellen.tsx`**
   - Hero tekst aanpassen
   - Info banner vervangen door HowItWorksBlock
   - SupportCTA toevoegen boven grid
   - Groepsgrootte context toevoegen
   - LogiesSuggestionBanner integreren (conditioneel)
   - Terminologie en tone of voice

2. **`src/components/configurator/GlobalCartDrawer.tsx`**
   - Terminologie aanpassen

3. **`src/components/configurator/ConfiguratorCart.tsx`**
   - Terminologie aanpassen

4. **`src/contexts/CartContext.tsx`**
   - Optioneel: toast feedback bij addToCart

---

## Visuele Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  [Navigation]                                                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ╔══════════════════════════════════════════════════════════════════════╗   │
│  ║                    HERO SECTIE (50vh)                                 ║   │
│  ║                                                                       ║   │
│  ║    Stel uw programma op Vlieland samen                               ║   │
│  ║                                                                       ║   │
│  ║    Kies activiteiten, catering en vervoer voor uw groep.             ║   │
│  ║    Wij controleren beschikbaarheid en zorgen dat alles goed          ║   │
│  ║    op elkaar aansluit.                                                ║   │
│  ║    Bij meerdaagse verblijven kunnen wij ook passende logies          ║   │
│  ║    voor uw groep verzorgen.                                          ║   │
│  ║                                                                       ║   │
│  ║    Activiteiten worden uitgevoerd door zorgvuldig geselecteerde      ║   │
│  ║    lokale partners.                                                   ║   │
│  ╚══════════════════════════════════════════════════════════════════════╝   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        ZO WERKT HET                                   │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │   │
│  │  │ 1. Kies wat │ │ 2. Meerdere │ │ 3. Beschik- │ │ 4. Bevesti- │     │   │
│  │  │ past bij uw │ │ dagen? Wij  │ │ baarheid    │ │ ging per    │     │   │
│  │  │ groep       │ │ regelen     │ │ controleren │ │ onderdeel   │     │   │
│  │  │             │ │ logies      │ │             │ │             │     │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │   │
│  │  ┌─────────────┐ ┌─────────────┐                                      │   │
│  │  │ 5. Directe  │ │ 6. Wij      │                                      │   │
│  │  │ facturering │ │ bewaken het │                                      │   │
│  │  │ door        │ │ totaal-     │                                      │   │
│  │  │ aanbieders  │ │ overzicht   │                                      │   │
│  │  └─────────────┘ └─────────────┘                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  (Als meerdere dagen geselecteerd - CONDITIONEEL)                     │   │
│  │  🛏️ Meerdaags verblijf geselecteerd                                   │   │
│  │  Wilt u dat wij ook passende logies regelen? [Logies laten regelen]   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Kies uw onderdelen                      Twijfelt u over de juiste   │   │
│  │                                          opzet? Wij denken graag     │   │
│  │                                          met u mee. [Neem contact op]│   │
│  │                                                                       │   │
│  │  Geschikt voor groepen vanaf 8 personen.                             │   │
│  │                                                                       │   │
│  │  [Alles] [Activiteiten] [Catering] [Vervoer]                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────┐ ┌─────────────────────┐    │
│  │  [Onderdelen Grid - 2 kolommen]              │ │  Uw Programma       │    │
│  │  ┌───────────────┐ ┌───────────────┐         │ │  (Sticky sidebar)   │    │
│  │  │ Onderdeel 1   │ │ Onderdeel 2   │         │ │                     │    │
│  │  │               │ │               │         │ │  [Cart items]       │    │
│  │  │ [Toevoegen]   │ │ [Toevoegen]   │         │ │                     │    │
│  │  └───────────────┘ └───────────────┘         │ │  [Submit button]    │    │
│  │  ...                                         │ │                     │    │
│  └─────────────────────────────────────────────┘ └─────────────────────┘    │
│                                                                              │
│  [Footer]                                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Niet Wijzigen

- Kaartstructuur blijft behouden
- Self-service flow blijft centraal
- Geen extra verplichte stappen
- Bestaande cart-functionaliteit
- Floating cart button animatie

---

## Samenvatting Wijzigingen

| Wijziging | Type | Impact |
|-----------|------|--------|
| Hero tekst formeel maken | Tekst | Hoog |
| "Zo werkt het" blok | Nieuw component | Hoog |
| Logies suggestion banner | Nieuw component | Medium |
| Support CTA | Nieuw component | Laag |
| Terminologie "onderdelen" | Tekst | Medium |
| Tone of voice formaliseren | Tekst | Medium |
| Verwijder juridische info | Verwijderen | Medium |
| Toast bij toevoegen | UX | Laag |

