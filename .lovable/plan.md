
# Fix: ProgramIntroCard en ActionRequiredCard alleen op Programma-tab

## Probleem

In de huidige implementatie worden twee kaarten altijd bovenaan `DesktopProgramView` en `MobileProgramView` getoond, ongeacht welke tab actief is:

1. **`ProgramIntroCard`** — de blauwe kaart met de uitleg "Hieronder vindt u het programma…" en de knop "Akkoord, start reserveringen". Volledig programmaspecifiek.
2. **`ActionRequiredCard`** — de actiekaart met openstaande stappen. Wanneer Logies-tab actief is, verwijst deze naar programmaacties die niet relevant zijn.

Beide worden gerenderd vóór de `initialSection`-conditionals, dus ze verschijnen ook op de Logies-tab.

## Oplossing

Wrap beide kaarten in een conditie: render ze **alleen** wanneer `initialSection === "program"` (of `initialSection` is undefined, voor toekomstige eendaagse programma's zonder tab-splitsing).

De `ProgramOverviewCard` (datum, personen, kenmerk) blijft zichtbaar op alle tabs — die is tab-onafhankelijk als header.

## Wijzigingen per bestand

### `DesktopProgramView.tsx`
- `ProgramIntroCard`: omhullen met `{initialSection === "program" && (...)}`
- `ActionRequiredCard`: omhullen met `{(initialSection === "program" || !initialSection) && (...)}`

### `MobileProgramView.tsx`
- Idem: `ProgramIntroCard` alleen bij `initialSection === "program"`
- `ActionRequiredCard` alleen bij `initialSection === "program" || !initialSection`

## Wat blijft staan op de Logies-tab

- `ProgramOverviewCard` (datum/pax/kenmerk — altijd relevant)
- `AccommodationSection` (logiesinhoud zelf)
- Sidebar (`ProgramSidebar` op desktop) — blijft altijd zichtbaar

## Wat verdwijnt van de Logies-tab

- `ProgramIntroCard` (offerte-uitleg + akkoordknop)
- `ActionRequiredCard` (programma-gerelateerde acties)

## Bestanden gewijzigd

| Bestand | Wijziging |
|---------|-----------|
| `src/components/customer-portal/DesktopProgramView.tsx` | Conditioneel renderen ProgramIntroCard + ActionRequiredCard |
| `src/components/customer-portal/MobileProgramView.tsx` | Idem |

Geen database-wijzigingen, geen nieuwe componenten.
