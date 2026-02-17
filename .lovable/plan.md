

## Plan: Klantportaal herstructureren en verbeteren

### Wat verandert er

De klantpagina wordt logischer opgebouwd: secties worden in de juiste volgorde geplaatst, afbeeldingen komen terug bij programma-items, logiesoffertes worden op dezelfde manier gepresenteerd als programma-onderdelen, en het maatwerkvoorstel-blok krijgt een warmere, meer uitleggende toon.

---

### 1. Volgorde aanpassen: Logies - Programma - Facturatie

**Huidige volgorde** (in beide views):
1. ProgramOverviewCard (hero)
2. AcceptQuoteProposalCard (maatwerk akkoord)
3. ActionRequiredCard
4. Accommodation (logies)
5. Programma
6. Facturatie
7. Voorwaarden

**Nieuwe volgorde**:
1. ProgramOverviewCard (hero)
2. ActionRequiredCard (intelligente alert)
3. **Introductietekst** (nieuw, vervangt AcceptQuoteProposalCard als los blok)
4. **Logies** (id="accommodation")
5. **Programma** (id="program")
6. **Facturatie** (id="billing")
7. Voorwaarden

De introductietekst wordt geen apart blok meer maar wordt geintegreerd bovenaan de pagina, onder de overview card. Altijd zichtbaar (niet alleen bij maatwerk), met aangepaste tekst per situatie.

**Navigatiebalk** (`ProgramNavigation.tsx`):
- Volgorde wordt: Logies, Programma, Facturatie
- Default active section wordt "accommodation" bij meerdaags, "program" bij eendaags

**Bestanden**: `ProgramNavigation.tsx`, `DesktopProgramView.tsx`, `MobileProgramView.tsx`

---

### 2. Introductietekst: warme uitleg boven het programma

In plaats van het technische "AcceptQuoteProposalCard" blok komt er een vriendelijke introductietekst die de klant uitlegt wat ze kunnen doen. De tekst verschilt per situatie:

**Bij maatwerkvoorstel (quote mode, offerte_verstuurd)**:
> "Hieronder vindt u het programma dat wij speciaal voor u hebben samengesteld. U kunt uiteraard nog wijzigingen aanbrengen -- activiteiten verwijderen, tijden aanpassen of onderdelen toevoegen. Zodra u tevreden bent, kunt u het programma akkoord geven. Onze partners worden vervolgens per e-mail op de hoogte gesteld en bevestigen de definitieve reserveringen."

Met daaronder de "Akkoord, start reserveringen" knop (functionaliteit blijft identiek aan huidige AcceptQuoteProposalCard).

**Bij zelfservice (na indienen)**:
> "Hieronder vindt u uw programma. Wij hebben de aanvragen verstuurd naar de aanbieders. Zodra zij reageren ontvangt u een e-mail. U kunt in de tussentijd onderdelen wijzigen, verwijderen of toevoegen."

**Na akkoord/bevestiging**:
> "Uw programma is bevestigd. Hieronder vindt u het overzicht van alle onderdelen."

Dit blok vervangt het bestaande `AcceptQuoteProposalCard` component. De akkoord-knop en geldigheids-logica worden in het nieuwe introductieblok geintegreerd.

**Bestand**: `DesktopProgramView.tsx`, `MobileProgramView.tsx` (inline, of nieuw `ProgramIntroCard.tsx`)

---

### 3. Afbeeldingen terug bij programma-items

De `CustomerProgramItem` component heeft al toegang tot `image_url` en `image_asset` via het item object (type `ProgramRequestItem` bevat deze velden). De bestaande `getBlockImage` utility wordt hergebruikt.

**Implementatie in `CustomerProgramItem.tsx`**:
- Een kleine thumbnail (w-16 h-16 op desktop, w-12 h-12 op mobiel) links van de titel toevoegen
- Dezelfde aanpak als `ProgramTimeline.tsx` maar compacter
- Alleen tonen als er een afbeelding beschikbaar is

```text
  09:00  o----[ [img] Strandwandeling              [Bevestigd]  [v] ]
                     Aanbieder X
                     10:00  |  1,5 uur  |  EUR 125,00
                                         [Akkoord] [Verwijderen]
```

**Bestand**: `CustomerProgramItem.tsx`

---

### 4. Logiesoffertes presenteren als programma-onderdelen

De `AccommodationSection` toont quotes momenteel als een aparte kaartlijst met een "Eye" knop en "Kies" knop. Dit wijkt af van hoe programma-items werken (collapsible met inline acties).

**Nieuwe aanpak voor State 3 (quotes beschikbaar)**:
- Elke quote wordt als een collapsible item weergegeven, vergelijkbaar met `CustomerProgramItem`
- Bovenaan: naam accommodatie, partner, prijs, geldigheid
- Uitklappen: volledige details (kamers, voorwaarden, etc.) -- gebruikt bestaande `AccommodationQuoteDetailSheet` data
- Actieknoppen rechts uitgelijnd: "Bekijk details" en "Kies deze accommodatie"
- Bij State 2 (gekozen quote): vergelijkbare kaart maar met groene "Gekozen" status, net als een geaccepteerd programma-item

**Aanpak**:
- De bestaande `AccommodationQuoteDetailSheet` blijft beschikbaar voor uitgebreide details
- De quote-kaarten in `AccommodationSection` krijgen dezelfde visuele structuur als `CustomerProgramItem`: titel + meta-rij + actierij

**Bestand**: `AccommodationSection.tsx`

---

### 5. Sidebar volgorde aanpassen

De sidebar checklist volgt dezelfde nieuwe volgorde:
1. Logies
2. Programma
3. Facturatie
4. Voorwaarden

Dit is al grotendeels zo (logies staat bovenaan), maar de code-volgorde in `StatusSummary.tsx` wordt expliciet gecontroleerd.

**Bestand**: `ProgramSidebar.tsx`, `StatusSummary.tsx` (indien nodig)

---

### Advies en overwegingen

**Wat ik zelf zou adviseren:**

1. **De introductietekst is cruciaal**: Klanten weten nu niet wat ze kunnen doen tot ze gaan klikken. Een duidelijke uitleg bovenaan ("u kunt wijzigen, verwijderen, toevoegen") verlaagt de drempel enorm.

2. **Logies eerst is logisch**: Het volgt de "geen bed, geen programma" filosofie. De klant ziet eerst of het overnachten geregeld is, dan pas de activiteiten.

3. **Afbeeldingen helpen herkenning**: Zonder afbeelding is het lastig om snel te scannen welk onderdeel wat is. Een kleine thumbnail is voldoende -- het hoeft geen grote hero-afbeelding te zijn.

4. **AcceptQuoteProposalCard kan weg als los blok**: Het is verwarrend als een apart "akkoord" blok los staat van het programma. Door de akkoord-actie te integreren in de introductietekst voelt het natuurlijker aan.

---

### Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/components/customer-portal/ProgramNavigation.tsx` | Volgorde: Logies, Programma, Facturatie |
| `src/components/customer-portal/ProgramIntroCard.tsx` | **Nieuw**: introductietekst met contextafhankelijke copy en optionele akkoord-knop |
| `src/components/customer-portal/DesktopProgramView.tsx` | Volgorde secties aanpassen, AcceptQuoteProposalCard vervangen door ProgramIntroCard |
| `src/components/customer-portal/MobileProgramView.tsx` | Idem als desktop |
| `src/components/customer-portal/CustomerProgramItem.tsx` | Thumbnail afbeelding toevoegen |
| `src/components/customer-portal/AccommodationSection.tsx` | Quote-weergave omzetten naar collapsible items met dezelfde look als programma-items |

