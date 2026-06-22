## Doel

De klantreis vanaf "programma ontvangen" tot "alles definitief" minimalistisch én kristalhelder maken. Eén verhaal, één teller, twee duidelijk verschillende akkoord-momenten. Vertrouwen wekken door transparantie over wat Bureau Vlieland doet en wat van de klant wordt verwacht.

Inclusief alle UX-verbeteringen uit de vorige iteratie (Wacht-op-partner labels, full-width akkoord-CTA, banner per onderdeel).

---

## Probleemdiagnose (uit screenshot)

| Element | Probleem |
| --- | --- |
| Tab-badge `Programma · 3 acties` (rood) | Geen uitleg waaróm 3, niet zichtbaar wáár |
| Sidebar: `Onderdelen goedkeuren (5 van 7)` | Telt items die wachten op partner mee — die kán de klant niet goedkeuren |
| Knop boven programma: `Alle onderdelen goedkeuren (2)` | Andere teller (2) dan sidebar (5 van 7) — verwarrend |
| `2/7 bevestigd` rechtsboven | Vierde teller met andere noemer |
| Banner "Aanvragen verstuurd" + losse regel "Bureau Vlieland coördineert..." | Dubbel, en hoort eigenlijk bij de fase-uitleg |
| Geen uitleg dat partners alternatief kunnen voorstellen | Klant weet niet wat te verwachten |

---

## Mentaal model — 4 heldere stappen

Eén lineaire reis, altijd dezelfde volgorde, altijd dezelfde nummering, overal in het portaal:

```
1. Voorstel goedkeuren        → klant geeft groen licht op het programma
2. Aanbieders bevestigen      → Bureau Vlieland regelt; klant beoordeelt afwijkingen
3. Gegevens & voorwaarden     → facturatie + AV ondertekenen
4. Definitief                 → alles staat
```

**Twee soorten klantakkoord** worden expliciet onderscheiden:
- **Voorstel-akkoord** (stap 1): "Ik geef akkoord op dit voorstel zoals het er nu staat." Eén knop, één moment, voor het hele programma. Daarna stuurt BV de aanvragen uit.
- **Wijzigings-akkoord** (stap 2): "Ik ga akkoord met deze afwijking van de partner." Alleen op onderdelen waar de partner een andere tijd of prijs voorstelt. Per onderdeel een knop.

---

## Nieuwe layout — Programma-tab

### A. Boven het programma: één "Waar zit u in het proces?"-strook
Vervangt het huidige duo (blauwe info-banner + losse regel + losse approve-knop).

```text
[stap 1] Voorstel         [stap 2] Aanbieders        [stap 3] Gegevens         [stap 4] Definitief
  GEDAAN ✓                 BEZIG · 2 reacties open    OPEN · 1 van 2            
  Goedgekeurd 18 jun       Wij wachten op 3 partners                            
                            U beoordeelt 2 wijzigingen
```

- Eén progressielijn met 4 bolletjes, actieve stap groot weergegeven.
- Onder de actieve stap: één heldere zin ("Wij wachten op 3 partners. Zodra ze reageren laten we het u weten.") plus, alleen als de klant nu écht iets moet doen, één CTA-knop ("Beoordeel 2 wijzigingen ↓" scrollt naar het eerste item dat actie vraagt).
- Vervangt `ProgramOverviewCard` blauwe banner + losse coordinator-regel + `Alle onderdelen goedkeuren`-knop.

### B. Eén bron van waarheid voor "wat moet ik doen?"

Nieuwe afgeleide telstaten in `useProgramStatus`:
- `customerActionsOpen` — som van:
  - voorstel nog niet goedgekeurd (0 of 1)
  - aantal items met `status in ("alternative","counter_proposed")` waar klantakkoord ontbreekt
  - praktisch-blok onvolledig (facturatie + AV)
- `customerActionsBreakdown` — gestructureerd voor weergave per stap

Alle UI-tellers (tab-badge, hero-strook, sidebar, mobiele sticky) lezen uitsluitend uit deze hook. Geen lokale berekeningen meer per component.

### C. Tab-badges — alleen tellen wat de klant nu kán doen

- `Programma · N` → alleen wijzigings-akkoorden + (indien stap 1 nog open) "voorstel goedkeuren"
- `Praktisch · Aanvullen` → ongewijzigd, label i.p.v. cijfer
- Klikken op tab-badge scrollt automatisch naar het eerste open item (anchor + `scrollIntoView`).
- Rood weglaten als het puur "wacht op partner" is — dan amber/info, geen alarm.

### D. Items in de lijst — drie duidelijke visuele states

| State | Visueel | Klantactie |
| --- | --- | --- |
| Wacht op partner | grijze rand, klok-icoon, regel "We wachten op een reactie van de aanbieder" | geen |
| Wijziging voorgesteld | amber border-2 + linkerbalk, mini-banner "Partner stelt aanpassing voor — uw akkoord nodig", diff van tijd/prijs zichtbaar | volle-breedte groene knop "Ik ga akkoord met deze wijziging" (+ "Bespreek alternatief") |
| Akkoord rond | groene regel "U hebt akkoord gegeven op dit onderdeel" | geen |

Pending-items kunnen dus géén verwarrende akkoord-knop tonen.

### E. Sidebar (rechts) — vereenvoudigen
Vervang de huidige twee kaarten door één compacte "Mijn reis"-kaart die exact dezelfde 4 stappen toont als de hero-strook, met dezelfde tellers. Geen aparte "5 van 7" meer.

`Toeristenbelasting` / `Natuurbijdrage` / `Trattoria Oliva` blok blijven zoals nu.

---

## Microcopy — vertrouwen wekken in 3 zinnen

Vaste introblok bovenaan stap 2 (alleen zichtbaar zolang stap 2 loopt), letterlijk de boodschap uit jouw bericht, ingekort:

> **Hoe het verder gaat**
> Bureau Vlieland vraagt nu beschikbaarheid en definitieve prijzen op bij de partners. Het kan voorkomen dat een partner een andere tijd of prijs voorstelt — die ziet u meteen hier verschijnen en kunt u zelf goed- of afkeuren. Uw boeking is definitief zodra alle partners én u akkoord zijn.

Soortgelijke 1-zin uitleg op stap 1, 3, 4. Tone: formeel "u", rustig, geen uitroeptekens.

---

## Wat verdwijnt

- Losse `ProgramOverviewCard` blauwe "Aanvragen verstuurd"-banner (gaat op in hero-strook).
- Losse regel "Bureau Vlieland coördineert de aanvragen..." (idem).
- Knop `Alle onderdelen goedkeuren (N)` — bulk-actie blijft alleen beschikbaar binnen stap 1 (voorstel-akkoord). Voor wijzigingen géén bulk, want diff per onderdeel moet bewust beoordeeld worden.
- Sidebar-blok `Onderdelen goedkeuren (5 van 7)` — opgegaan in "Mijn reis".
- `2/7 bevestigd` chip rechtsboven — overbodig naast de stappenstrook.
- Rode `3 acties` tab-badge — wordt amber en alleen geteld als het écht klantacties zijn.

---

## Technische uitvoering

Frontend-only. Geen databasewijzigingen, geen edge-functies.

**Bestanden te wijzigen:**
- `src/hooks/useProgramStatus.ts` — nieuwe `customerActionsOpen` + `customerActionsBreakdown`, distinctie voorstel-akkoord vs wijzigings-akkoord.
- `src/components/customer-portal/ProgramStepper.tsx` — herbouw als 4-stappen reis-strook met statuslabels per stap.
- `src/components/customer-portal/ProgramOverviewCard.tsx` — verwijderen of strippen tot dunne contextregel.
- `src/components/customer-portal/ProgramSidebar.tsx` — vervang door één "Mijn reis"-kaart die `customerActionsBreakdown` rendert.
- `src/components/customer-portal/StatusSummary.tsx` — verwijder losse `2/7 bevestigd` chip.
- `src/components/customer-portal/tabHeaderConfig.ts` — badges uit `customerActionsOpen`; rood→amber als geen klantactie.
- `src/components/customer-portal/CustomerProgramItem.tsx` — drie expliciete states + diff-blok + full-width groene CTA bij wijziging.
- `src/components/customer-portal/ActionRequiredCard.tsx` — copy uitlijnen op nieuwe stappen of opheffen (functie zit nu in hero-strook).
- `src/components/customer-portal/AcceptProposalCard.tsx` — copy "Goedkeuring voorstel" expliciet maken; toon BV-belofte ("Hierna vragen wij prijzen op bij de partners").
- `src/components/customer-portal/DesktopProgramView.tsx` + `MobileProgramView.tsx` — nieuwe compositie.
- `src/components/customer-portal/MobileBottomNav.tsx` + `MobileStickyStatus.tsx` — zelfde tellers.

**Niet aanraken**: database-enums, statuslogica in `useProgramStatus` voor `allConfirmed`, partner-portal, edge-functies, e-mails (de "wacht op partner"-label-omzetting uit vorige plan blijft staan).

---

## Verificatie

Met Playwright op het portaal van project BV-2606-0011:
1. Stap 1 open → hero toont stap 1 actief, één CTA "Geef akkoord op het voorstel", tab-badge `Programma · 1`.
2. Na klantakkoord → stap 1 wordt GEDAAN, stap 2 actief, badge wordt "wacht op partner" zonder rood.
3. Simuleer partner-tegenvoorstel op één item → tab-badge `Programma · 1` (amber), hero toont "U beoordeelt 1 wijziging", item heeft amber border + groene "Ik ga akkoord met deze wijziging"-knop.
4. Sidebar toont overal exact dezelfde tellers als hero en tab.

---

## Vragen voor jou

1. Akkoord met de 4 vaste stappen (Voorstel → Aanbieders → Gegevens → Definitief)?
2. Akkoord dat de bulk-knop "Alle onderdelen goedkeuren" verdwijnt voor wijzigings-akkoord (per item bewuste keuze), maar blijft voor de eerste voorstel-goedkeuring?
3. Akkoord dat we de losse `2/7 bevestigd`-chip en de blauwe "Aanvragen verstuurd"-banner laten opgaan in de nieuwe stappenstrook?
