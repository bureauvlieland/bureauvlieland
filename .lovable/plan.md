## Probleem

De huidige "Voortgang"-card mengt twee fundamenteel verschillende klanttrajecten in één lineaire stepper:

1. **Logies** = aparte aanvraag met eigen portaal, eigen offertes van logies-aanbieders, eigen beslismoment.
2. **Programma** = activiteiten/onderdelen die door aanbieders bevestigd en door de klant goedgekeurd worden, met daarna factuurgegevens + voorwaarden.

Concrete pijnpunten op de screenshot:
- "Logies kiezen" staat als stap 1 vóór "Aanbieders bevestigen" terwijl die twee parallelle sporen zijn, geen volgordelijke. De klant krijgt de indruk dat het programma "wacht" op de logies.
- **"Offertes bekijken"** is dubbelzinnig: in deze context bedoelt het logies-offertes, maar de klant kent ook een programma/bureau-offerte. De knop scrollt nu blind naar `#accommodation` ook als er nog 0 offertes binnen zijn.
- "**Nu aan u**: Offertes worden verzameld" is feitelijk onjuist — in deze fase is er níets aan de klant. We jagen de klant met een primaire CTA terwijl het bureau aan zet is.
- Terminologie wisselt: "offertes" (logies), "offerte" (programma/bureau), "aanbieders" (programma-partners), "logies-aanbieders" — niet consistent.

## Voorgestelde oplossing

### 1. Twee parallelle tracks in plaats van één lange stepper

Vervang de huidige horizontale 4-staps stepper door een card met **twee duidelijk gescheiden tracks**, gestapeld onder elkaar:

```text
┌─ Uw aanvraag ────────────────────────── Status: in afstemming ─┐
│                                                                │
│  LOGIES  (alleen bij meerdaags)                                │
│  ●━━━━━━●━━━━━━○                                               │
│  Aanvraag    Offertes      Logies                              │
│  ingediend   vergelijken   vastgelegd                          │
│  ▸ "Wij verzamelen logies-offertes — u hoeft nu niets te doen."│
│                                                                │
│  ─────────────────────────────────────────────────────────     │
│                                                                │
│  PROGRAMMA                                                     │
│  ●━━━━━━○━━━━━━○                                               │
│  Aanbieders   Onderdelen    Gegevens &                         │
│  bevestigen   goedkeuren    voorwaarden                        │
│  ▸ "0 van 6 onderdelen bevestigd door aanbieders."             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

Beide tracks tonen eigen mini-stappen, eigen sub-tekst en eigen CTA-regel onderaan (alleen wanneer er werkelijk iets aan de klant is). Eéndaagse aanvragen tonen alleen het programma-blok.

### 2. CTA-regels alleen wanneer de klant aan zet is

Vervang de huidige "Nu aan u"-balk door **per track één regel** die de daadwerkelijke ownership uitspreekt:

| Track + status | Tekst | CTA |
|---|---|---|
| Logies — aangevraagd, 0 offertes binnen | "Wij verzamelen logies-offertes voor u. U hoeft nu niets te doen." | (geen knop, alleen subtiele link "Status logies") |
| Logies — ≥1 offerte binnen | "Vergelijk de binnengekomen logies-offertes en kies uw favoriet." | **Logies-offertes vergelijken** → scrollt naar `#accommodation` |
| Logies — selected | "Logies vastgelegd." | (geen knop, evt. "Logies bekijken") |
| Programma — aanbieders bezig | "Aanbieders bevestigen uw onderdelen. U hoort van ons zodra u kunt goedkeuren." | (geen knop) |
| Programma — klaar voor goedkeuren | "U kunt nu uw programma-onderdelen goedkeuren." | **Onderdelen goedkeuren** |
| Programma — goedgekeurd | "Vul uw factuurgegevens aan en onderteken de voorwaarden." | **Gegevens invullen** / **Ondertekenen** |

Daarmee verdwijnt de misleidende "Offertes bekijken"-knop in fases waarin er nog niets te bekijken is.

### 3. Consistente terminologie over de hele klantpagina

Vaststellen en overal doorvoeren:

| Begrip | Vaste term | Wat het niet meer mag heten |
|---|---|---|
| Aanbod van een logies-aanbieder | **logies-offerte** | "offerte" (zonder context), "aanbieding" |
| Aanbod van Bureau Vlieland voor het hele project | **programma-offerte** | "offerte" (zonder context) |
| Partner die een programma-onderdeel uitvoert | **aanbieder** | "partner", "uitvoerder", "leverancier" |
| Partner die logies levert | **logies-aanbieder** | "logies-partner", "accommodatie-partner" |
| Eén regel in het programma | **onderdeel** | "activiteit" (alleen voor sub-types), "item", "blokje" |
| Klant zegt JA tegen onderdeel | **goedkeuren** | "bevestigen" (= van de aanbieder) |
| Aanbieder zegt beschikbaar | **bevestigen** | "goedkeuren", "accepteren" |
| Klant tekent voorwaarden | **ondertekenen** | "akkoord geven", "bevestigen" |

Glossary-tooltip in de card uitbreiden zodat de klant deze drie werkwoorden uit elkaar kan houden ("aanbieder bevestigt", "u keurt goed", "u ondertekent").

### 4. Card-titel + sub

- Header: **"Uw aanvraag"** met rechtsboven een statusbadge (bv. *"In afstemming"* / *"Klaar voor goedkeuring"* / *"Definitief"*) i.p.v. de huidige "Stap X van 4" — die telling klopt niet meer in twee parallelle tracks.
- Sub onder header: één zin die het bredere overzicht geeft, bv. "U volgt hier de status van uw logies én uw programma."

## Implementatie

### Te wijzigen bestanden

| Bestand | Wijziging |
|---|---|
| `src/components/customer-portal/ProgramStepper.tsx` | Refactor: één component met **twee sub-tracks** (`LodgingTrack`, `ProgramTrack`). Logica voor "wie is aan zet" per track. Mobiele weergave: per track een eigen compacte pill met aparte expand. |
| `src/components/customer-portal/DesktopProgramView.tsx` | Nieuwe props doorgeven: `accommodationQuoteCount`, behoud van bestaande scroll-handlers. `handleStepAction` uitbreiden voor de twee tracks. |
| `src/components/customer-portal/MobileProgramView.tsx` | Idem als Desktop. |
| `src/components/customer-portal/CustomerPortalSplash.tsx` | Terminologie-pass: "offertes" → "logies-offertes" / "programma-offerte" waar nodig. |
| `src/components/customer-portal/DesktopProgramView.tsx` + `MobileProgramView.tsx` | Verwijder de losse "Logies nog niet geregeld"-banner als de nieuwe track die info al toont; voorkom dubbele meldingen. |
| `src/components/accommodation-portal/*` | Terminologie-check: "aanbieders" voor logies-aanbieders consequent als "logies-aanbieders" labelen. |

### Geen wijzigingen aan

- Onderliggende status-logica (`statusSummary`, `accommodation_quotes.status`, etc.) — alleen presentatie.
- E-mails / edge functions / database — uitsluitend front-end UX.

## Open punt voor de klant (optioneel)

Wanneer er **geen logies-track is** (één-daags) gaat de programma-track in zijn eentje over de hele breedte. Wil je dat we in dat geval extra ruimte gebruiken voor grotere icoontjes/labels, of behouden we exact dezelfde compacte hoogte als nu? — Default: compact houden, geen herontwerp per case.
