
# Herpositionering Klantportaal "Jouw Programma"

## Samenvatting
Een volledige herpositionering van de klantomgeving met focus op zakelijke tone of voice, partnerschap in plaats van platform-gevoel, en een verbeterde visuele hiërarchie. De wijzigingen omvatten een nieuw programma-overzicht, een herschreven logies-banner, een verbeterd statusblok en een waarschuwingsflow bij bevestigen zonder logies.

## Wat er gaat veranderen

### 1. Nieuw: Programma-overzicht blok (bovenkant)
Een nieuw overzichtsblok direct boven alle content dat zakelijke beslissers onmiddellijk context geeft.

**Nieuwe component:** `ProgramOverviewCard.tsx`

| Veld | Inhoud |
|------|--------|
| Titel | "Jouw zakelijke programma op Vlieland" |
| Subtekst | "Wij stemmen activiteiten, logies en planning op elkaar af zodat alles klopt." |
| Datum | 12 – 14 juni 2026 |
| Groep | 25 personen |
| Type | "Meerdaags verblijf" of "Eendaags programma" |
| Logies | Dynamisch: "Nog niet geregeld" / "Offerte ontvangen" / "Bevestigd" |

---

### 2. Logies-banner herschrijven
Van instructief naar ondersteunend/partner-toon.

**Bestand:** `AccommodationSection.tsx`

**Huidige tekst:**
```
"Meerdaags programma? Begin met logies!"
"Vind eerst passende accommodatie voor je groep..."
Knop: "Zoek logies"
```

**Nieuwe tekst:**
```
"Meerdaags verblijf? Wij helpen graag met passende logies."
"Een sterk programma begint met comfortabele en beschikbare accommodatie.
Wij vragen vrijblijvend offertes aan bij geschikte locaties en voegen deze 
toe aan uw programma."
Knop: "Logies laten regelen"
Microcopy: "Vrijblijvend. U ontvangt binnen 2 werkdagen passende voorstellen."
```

---

### 3. Statusblok aanpassen
Van simpele numerieke weergave naar inhoudelijke checklist.

**Bestand:** `StatusSummary.tsx` + `ProgramSidebar.tsx`

**Huidige weergave:**
```
Status 0/3
[progress bar]
✓ 2 bevestigd | ⏱ 1 wachtend | 💬 0 alternatieven
```

**Nieuwe weergave (checklist-stijl):**
```
Status programma
✓ Activiteiten bevestigd
✓ Facturatiegegevens compleet
○ Logies nog niet geregeld
○ Voorwaarden accepteren
```

Dit maakt de workflow visueel en logisch, en benadrukt waarom logies een prioriteit is.

---

### 4. Waarschuwing bij bevestigen zonder logies
Een zachte bevestigingscheck wanneer een meerdaags programma definitief wordt bevestigd zonder logies.

**Nieuwe component:** `AccommodationWarningDialog.tsx`

**Trigger:** Wanneer `selectedDates.length > 1` EN geen geselecteerde logiesofferte EN gebruiker klikt op "Ondertekenen"

**Dialoog tekst:**
```
"U heeft nog geen logies geselecteerd."

Wilt u:
[ ] Logies laten regelen via Bureau Vlieland
[ ] Doorgaan zonder logies (u regelt dit zelf)

[Verder]
```

Dit geeft autonomie zonder frictie.

---

### 5. Pagina-intro en header aanpassen
Zakelijke, rustige, regisseur-achtige toon.

**Bestand:** `CustomerProgram.tsx`

**Huidige header:**
```
<h1>Jouw Programma</h1>
<p>{company} • {aantal} personen</p>
```

**Nieuwe header:**
```
<h1>Jouw zakelijke programma op Vlieland</h1>
<p>Hier vindt u het overzicht van uw samengestelde programma.
Wij stemmen activiteiten, logies en planning op elkaar af zodat alles klopt.</p>
```

---

### 6. Positionering: van platform naar partner
Woorden en labels aanpassen van instructief naar begeleidend.

| Oude tekst | Nieuwe tekst |
|------------|--------------|
| "Zoek logies" | "Logies laten regelen" |
| "Begin met logies!" | "Wij helpen graag met passende logies" |
| "Selecteer" | "Kiezen" of "Wij verzorgen" |
| "Vind eerst..." | "Wij vragen vrijblijvend offertes aan..." |

---

## Technische Details

### Nieuwe bestanden:
```
src/components/customer-portal/ProgramOverviewCard.tsx     (nieuw)
src/components/customer-portal/AccommodationWarningDialog.tsx (nieuw)
```

### Bestanden die worden aangepast:
```
src/pages/CustomerProgram.tsx                              (header tekst)
src/components/customer-portal/AccommodationSection.tsx    (banner tekst)
src/components/customer-portal/StatusSummary.tsx           (nieuwe variant)
src/components/customer-portal/ProgramSidebar.tsx          (nieuwe status variant)
src/components/customer-portal/NextStepsCard.tsx           (logies toevoegen aan steps)
src/components/customer-portal/DesktopProgramView.tsx      (overview card + flow)
src/components/customer-portal/MobileProgramView.tsx       (overview card + flow)
src/components/customer-portal/AcceptTermsCard.tsx         (logies warning integratie)
```

### ProgramOverviewCard component structuur:

```tsx
interface ProgramOverviewCardProps {
  selectedDates: Date[];
  numberOfPeople: number;
  customerCompany?: string;
  accommodation: AccommodationRequest | null;
  accommodationQuotes: AccommodationQuote[];
}

// Logies status logic:
const getAccommodationStatus = () => {
  const hasSelectedQuote = quotes.some(q => q.status === "selected");
  const hasSubmittedQuotes = quotes.some(q => q.status === "submitted");
  
  if (hasSelectedQuote) return { label: "Bevestigd", variant: "success" };
  if (hasSubmittedQuotes) return { label: "Offerte ontvangen", variant: "info" };
  if (accommodation) return { label: "In behandeling", variant: "warning" };
  return { label: "Nog niet geregeld", variant: "muted" };
};

// Program type logic:
const programType = selectedDates.length > 1 
  ? "Meerdaags verblijf" 
  : "Eendaags programma";
```

### Verbeterde StatusSummary (nieuwe "checklist" variant):

```tsx
// New variant: "checklist"
if (variant === "checklist") {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Status programma</h3>
      <ul className="space-y-1.5 text-sm">
        <li className="flex items-center gap-2">
          {activitiesConfirmed ? <CheckCircle /> : <Circle />}
          Activiteiten bevestigd
        </li>
        <li className="flex items-center gap-2">
          {billingComplete ? <CheckCircle /> : <Circle />}
          Facturatiegegevens compleet
        </li>
        <li className="flex items-center gap-2">
          {hasAccommodation ? <CheckCircle /> : <Circle />}
          Logies geregeld
        </li>
        <li className="flex items-center gap-2">
          {termsAccepted ? <CheckCircle /> : <Circle />}
          Voorwaarden geaccepteerd
        </li>
      </ul>
    </div>
  );
}
```

### AccommodationWarningDialog:

```tsx
interface AccommodationWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinueWithAccommodation: () => void;
  onContinueWithout: () => void;
}

// Usage in AcceptTermsCard:
const [showAccommodationWarning, setShowAccommodationWarning] = useState(false);

const handleAcceptClick = () => {
  const isMultiDay = selectedDates.length > 1;
  const hasSelectedAccommodation = accommodationQuotes.some(q => q.status === "selected");
  
  if (isMultiDay && !hasSelectedAccommodation) {
    setShowAccommodationWarning(true);
  } else {
    handleAccept();
  }
};
```

## Overzicht wijzigingen per bestand

| Bestand | Type | Wijziging |
|---------|------|-----------|
| `ProgramOverviewCard.tsx` | Nieuw | Overzichtskaart met datum, groep, type, logies status |
| `AccommodationWarningDialog.tsx` | Nieuw | Zachte waarschuwing bij bevestigen zonder logies |
| `CustomerProgram.tsx` | Tekst | Header naar zakelijke toon |
| `AccommodationSection.tsx` | Tekst | Banner herschreven, knoplabel + microcopy |
| `StatusSummary.tsx` | Uitbreiding | Nieuwe "checklist" variant |
| `ProgramSidebar.tsx` | Props | Nieuwe props voor logies/billing status |
| `NextStepsCard.tsx` | Uitbreiding | Logies als stap toevoegen |
| `DesktopProgramView.tsx` | Layout | ProgramOverviewCard integreren |
| `MobileProgramView.tsx` | Layout | ProgramOverviewCard integreren |
| `AcceptTermsCard.tsx` | Flow | AccommodationWarningDialog trigger |

## Tone of Voice Transformatie

**Kernprincipe:** "Wij begeleiden uw zakelijke verblijf"

| Aspect | Oud | Nieuw |
|--------|-----|-------|
| Positionering | Platform/Marketplace | Partner/Regisseur |
| Actie-taal | "Selecteer", "Zoek", "Begin met" | "Wij verzorgen", "Wij regelen", "Wij stemmen af" |
| Relatie | Transactioneel | Begeleidend |
| Gevoel | Zelf bouwen | Samen zorgeloos |

**Kernboodschap:**
> "Stel samen, wij begeleiden."

## Resultaat
- Zakelijke beslissers krijgen direct overzicht en context
- Logies wordt benadrukt zonder te blokkeren
- Status is inhoudelijk en logisch
- Toon is partner-gericht, niet platform-achtig
- Autonomie blijft behouden met zachte waarschuwingen
