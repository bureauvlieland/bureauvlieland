

# Usability Analyse & Herontwerp Klantportaal "Jouw Programma"

## Geïdentificeerde Problemen

Na analyse van de huidige pagina-opzet heb ik de volgende usability-problemen vastgesteld:

### 1. **Onduidelijke Informatiehiërarchie**
De pagina toont te veel blokken van vergelijkbare visuele zwaarte:
- `ProgramOverviewCard` (lichte primary gradient)
- Logies sectie (Card in Card)  
- `NextStepsCard` (wit met stappen)
- `AcceptTermsCard` (groene achtergrond)
- Programma sectie (wit met tabs)
- Facturatie accordion
- Details accordion
- Extras sectie
- Contact sectie

**Probleem:** Alles concurreert om aandacht. De gebruiker weet niet waar te beginnen.

### 2. **Duplicatie van Informatie**
- Datum/groepsgrootte staat in `ProgramOverviewCard` én in "Programma Details" sectie
- Logies status staat in `ProgramOverviewCard` én apart in Logies-sectie
- Status wordt getoond in sidebar (checklist) én in `NextStepsCard`
- "Volgende stappen" wordt apart getoond én de losse acties staan verspreid

### 3. **Verkeerde Visuele Zwaarte**
- De `NextStepsCard` neemt veel ruimte in maar is eigenlijk secundaire informatie
- Facturatie is verstopt in een accordion maar is kritiek voor de workflow
- De sidebar is op desktop nuttig maar wordt op mobile volledig genegeerd

### 4. **Te Veel Secties voor Zakelijke Beslisser**
Een zakelijke beslisser wil drie dingen weten:
1. **Wat is de status?** (bevestigd/wachtend)
2. **Wat moet ik doen?** (actie)
3. **Wat kost het?** (financieel)

De huidige structuur beantwoordt deze vragen niet direct.

---

## Voorgesteld Herontwerp

### Nieuwe Structuur (Verticaal op Desktop)

```text
┌─────────────────────────────────────────────────────────────────┐
│  HERO HEADER                                                     │
│  "Jouw zakelijke programma op Vlieland"                         │
│  [Datum] • [Groep] • [Type] • [Logies status badge]             │
│  Subtekst: Wij stemmen activiteiten, logies en planning af     │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────┐  ┌───────────────────────────┐
│  ACTIE NODIG                      │  │  STATUS CHECKLIST         │
│  [Alert/CTA gebaseerd op status]  │  │  ✓ Activiteiten           │
│  - Logies regelen                 │  │  ○ Facturatie             │
│  - Akkoord geven op alternatief   │  │  ○ Voorwaarden            │
│  - Facturatie invullen            │  │                           │
│  - Ondertekenen                   │  │  [Sticky op desktop]      │
└───────────────────────────────────┘  └───────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  LOGIES (alleen bij meerdaags)                                   │
│  [AccommodationSection - compacter]                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PROGRAMMA                                                       │
│  [DayTabs met items - huidige opzet is goed]                    │
│  [Per item: status badge, akkoord-actie indien nodig]           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  FACTURATIE & KOSTEN                                            │
│  [Altijd open, niet in accordion]                               │
│  - Facturatiegegevens (met edit-knop)                           │
│  - Kostenoverzicht per aanbieder                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  AKKOORD & ONDERTEKENEN                                         │
│  [AcceptTermsCard - alleen als workflow dit vraagt]             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  VRAGEN? CONTACT                                                 │
│  [Compact contact blok]                                         │
└─────────────────────────────────────────────────────────────────┘

│ Programma details • Geschiedenis • Annuleren                     │
│ [Verborgen in footer/drawer - niet primair]                     │
```

---

## Concrete Wijzigingen

### 1. **Hero Header Vereenvoudigen**
Huidige `ProgramOverviewCard` is goed maar kan compacter. De grid met 4 items kan naar 1 regel:

```tsx
// Compact inline summary
<div className="flex items-center gap-4 flex-wrap text-sm">
  <span>12 – 14 juni 2026</span>
  <span>•</span>
  <span>25 personen</span>
  <span>•</span>
  <Badge variant={logiesStatus.variant}>{logiesStatus.label}</Badge>
</div>
```

### 2. **"Actie Nodig" Blok Introduceren**
Eén intelligent blok dat de **huidige prioriteit** toont:

| Situatie | Actie getoond |
|----------|---------------|
| Pending items | "Wacht op bevestiging van {n} aanbieders" |
| Alternative items | "Alternatief voorstel — actie vereist" + Akkoord-knoppen |
| Logies niet geregeld (multi-day) | "Wij regelen graag uw logies" |
| Facturatie incompleet | "Vul facturatiegegevens in" |
| Alles gereed voor ondertekening | "Programma gereed — onderteken nu" |
| Boeking compleet | Confetti 🎉 |

Dit vervangt `NextStepsCard` met iets actiegerichts.

**Nieuw component:** `ActionRequiredCard.tsx`

### 3. **NextStepsCard Verwijderen of Integreren**
De stappen-weergave is handig voor oriëntatie maar niet voor actie. Twee opties:

**Optie A:** Integreren in sidebar als compacte checklist (al geïmplementeerd als `StatusSummary` checklist variant)

**Optie B:** Tonen als "stepper" boven de pagina (horizontale stappen-indicator)

Voorstel: **Optie A** – de sidebar checklist is voldoende. `NextStepsCard` kan weg van de hoofdcontent.

### 4. **Facturatie Altijd Zichtbaar**
De facturatie-accordion is te verstopt. Voor zakelijke klanten is dit kritieke info.

**Wijziging:** Facturatie wordt een vaste sectie (geen accordion) met:
- Facturatiegegevens (Card met edit-knop)
- Kostenoverzicht per facturerende partij

### 5. **Sidebar Versterken (Desktop)**
De sidebar moet duidelijker de "voortgang" tonen:

```text
┌─────────────────────────────┐
│  STATUS                     │
│  ✓ Activiteiten bevestigd   │
│  ○ Facturatiegegevens       │
│  ○ Logies (meerdaags)       │
│  ○ Voorwaarden accepteren   │
├─────────────────────────────┤
│  VOLGENDE ACTIE             │
│  [Grote CTA knop]           │
│  "Facturatie invullen"      │
├─────────────────────────────┤
│  KOSTEN                     │
│  Totaal: €3.450             │
│  (incl. BTW)                │
└─────────────────────────────┘
```

### 6. **Details/Geschiedenis naar Footer**
"Programma Details" en "Geschiedenis" zijn secundair. Verplaats naar:
- Een "Meer opties" dropdown/menu
- Of een collapsed footer-sectie

### 7. **Mobile Responsive Flow**
Op mobile wordt de sidebar-content een sticky banner bovenaan:

```text
┌─────────────────────────────┐
│ Status: 2/4 ✓   €3.450     │
│ [Volgende: Facturatie]  → │
└─────────────────────────────┘
```

---

## Technische Implementatie

### Nieuwe Bestanden:
```
src/components/customer-portal/ActionRequiredCard.tsx     (nieuw)
src/components/customer-portal/MobileStickyStatus.tsx     (nieuw)
src/components/customer-portal/CompactBillingSection.tsx  (nieuw)
```

### Bestanden die worden aangepast:
```
src/components/customer-portal/ProgramOverviewCard.tsx    (compacter maken)
src/components/customer-portal/ProgramSidebar.tsx         (actie-CTA toevoegen)
src/components/customer-portal/DesktopProgramView.tsx     (layout herstructureren)
src/components/customer-portal/MobileProgramView.tsx      (sticky status + layout)
```

### Layout Wijziging DesktopProgramView:

```tsx
// Nieuwe volgorde main content:
<div className="space-y-6">
  {/* 1. Hero header (compacter) */}
  <ProgramOverviewCard ... variant="compact" />

  {/* 2. Actie nodig (indien van toepassing) */}
  <ActionRequiredCard ... />

  {/* 3. Logies (alleen multi-day, indien niet bevestigd) */}
  {isMultiDay && !hasSelectedAccommodation && (
    <AccommodationSection ... />
  )}

  {/* 4. Programma (altijd open) */}
  <ProgramCard ... />

  {/* 5. Facturatie & Kosten (altijd zichtbaar) */}
  <FinancialSection ... />

  {/* 6. Akkoord (alleen als workflow dit vraagt) */}
  {allConfirmed && !termsAccepted && <AcceptTermsCard ... />}

  {/* 7. Contact (compact) */}
  <ContactCard ... />
</div>

// Sidebar blijft met checklist + CTA
<ProgramSidebar ... />
```

### ActionRequiredCard Logica:

```tsx
const ActionRequiredCard = ({ statusSummary, ... }) => {
  // Determine priority action
  const getAction = () => {
    if (statusSummary.alternative > 0) {
      return { 
        type: "alternative",
        title: "Alternatief voorstel",
        description: "Een aanbieder heeft een alternatief voorgesteld. Geef akkoord of stel een andere tijd voor.",
        cta: "Bekijk voorstel",
        variant: "warning"
      };
    }
    if (statusSummary.pending > 0) {
      return {
        type: "pending",
        title: "Wachten op bevestiging",
        description: `Nog ${statusSummary.pending} activiteit(en) wachten op reactie van de aanbieder.`,
        cta: null, // No action needed
        variant: "info"
      };
    }
    if (isMultiDay && !hasAccommodation) {
      return {
        type: "accommodation",
        title: "Logies nog niet geregeld",
        description: "Wij vragen vrijblijvend offertes aan bij geschikte locaties.",
        cta: "Logies laten regelen",
        variant: "info"
      };
    }
    if (!billingComplete) {
      return {
        type: "billing",
        title: "Facturatiegegevens invullen",
        description: "Vul uw bedrijfsgegevens in voor de facturen.",
        cta: "Invullen",
        variant: "warning"
      };
    }
    if (allConfirmed && !termsAccepted) {
      return {
        type: "terms",
        title: "Programma gereed voor ondertekening",
        description: "Alle activiteiten zijn bevestigd. Accepteer de voorwaarden om te boeken.",
        cta: "Ondertekenen",
        variant: "success"
      };
    }
    return null; // All done, show nothing
  };
};
```

---

## Visuele Hiërarchie (Na Herontwerp)

| Element | Zwaarte | Doel |
|---------|---------|------|
| Hero header | **Hoog** | Context geven |
| Actie-nodig blok | **Hoog** | Focus op volgende stap |
| Programma items | Medium | Overzicht content |
| Facturatie | Medium | Transparantie kosten |
| Sidebar status | **Hoog** (sticky) | Voortgang bijhouden |
| Contact/Details | Laag | Ondersteunend |

---

## Tone of Voice Aanpassingen

| Huidig | Voorstel |
|--------|----------|
| "Volgende stappen" (instructief) | "Uw volgende stap" (persoonlijk) |
| "Status 2/4" (technisch) | "2 van 4 compleet" (leesbaar) |
| "Bekijken" (neutraal) | "Bekijk details" (duidelijker) |
| "Invullen" (kort) | "Gegevens invullen" (completer) |

---

## Samenvatting Wijzigingen

1. **Hero compacter** – metadata op 1 regel
2. **Actie-nodig blok** – vervangt NextStepsCard in main content
3. **Sidebar versterkt** – checklist + primaire CTA
4. **Facturatie altijd zichtbaar** – geen accordion
5. **Details naar footer** – minder visuele ruis
6. **Mobile sticky status** – altijd zichtbaar voortgang
7. **Minder duplicatie** – status alleen in sidebar, niet in cards

Het resultaat is een pagina waar de zakelijke beslisser direct ziet:
- Wat is de status? (sidebar checklist)
- Wat moet ik nu doen? (action card)
- Wat kost het? (financiële sectie)

