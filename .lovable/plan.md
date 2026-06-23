## Doel

De klantpagina in fase 2 ("Voorstel klaar") moet in één oogopslag duidelijk maken:
1. **Wat moet ik doen?** → akkoord geven
2. **Wat als ik iets wil wijzigen?** → zelf aanpassen of via chat
3. **Wat gebeurt er daarna?** → wij vragen beschikbaarheid op

Nu staan er meerdere kaarten boven elkaar (`TabHeader`, `ProgramOverviewCard`, `ActionRequiredCard`, `ProgramIntroCard`) die deels dezelfde boodschap herhalen. Resultaat: veel scrollen, dubbele tekst, en de echte CTA valt weg.

---

## 1. Eén "Hero Action"-kaart bovenaan (vervangt 2 huidige kaarten)

Vervang `ActionRequiredCard` + `ProgramIntroCard` in fase 2 door één geanimeerde **Voorstel-kaart** direct onder de TabHeader:

```text
┌─────────────────────────────────────────────────┐
│ ✨ Uw programmavoorstel ligt klaar              │
│                                                 │
│ Bekijk hieronder uw programma met indicatieve   │
│ prijzen. Onderdelen van Bureau Vlieland zijn    │
│ al bevestigd (✓). Voor de overige onderdelen    │
│ vragen wij — zodra u akkoord geeft —            │
│ beschikbaarheid en definitieve prijzen op bij   │
│ onze aanbieders.                                │
│                                                 │
│ [ ✓ Akkoord op het hele programma ]   (primair) │
│                                                 │
│ Iets wijzigen? Pas het zelf aan in het          │
│ programma hieronder, of stel uw vraag via       │
│ de chat rechtsonder 💬                          │
└─────────────────────────────────────────────────┘
```

**Vorm**: zachte gradient achtergrond (primary/10 → primary/5), subtiele `animate-fade-in` bij mount, primaire CTA met `hover-scale` + `pulse` ring zolang er nog niet is goedgekeurd. Op mobiel sticky bottom CTA-bar i.p.v. inline.

**Gedrag**:
- CTA scrollt + highlight: na klik → bevestigingsdialoog → bulk-approve → kaart morpht naar groen "Bedankt, wij gaan voor u aan de slag" met confetti-pulse.
- Chat-link in tekst opent de bestaande chat-widget (al rechtsonder).
- Wijzigingen-zin krijgt een kleine pijl naar het eerste programma-item.

## 2. ProgramOverviewCard inkrimpen → "Reissamenvatting"-strip

De huidige overzichtskaart herhaalt datums/personen die ook in de TabHeader staan. Maak er een compacte 1-regel strip van (datum · personen · referentie · "wijzig"-link), direct onder de TabHeader. Geen eigen kaart meer in fase 2.

## 3. Programma-lijst — per-item duidelijkheid

Per `CustomerProgramItem`:
- **Bureau Vlieland items** (veerboot, fietsen, eigen activiteiten): groene `✓ Bevestigd door Bureau Vlieland` badge, geen actie nodig, lichte achtergrond.
- **Partner items in fase 2**: amber badge `Wacht op uw akkoord`, met subtiele puls op de badge tot er akkoord is.
- **Wijzig/verwijder** knoppen blijven inline maar krijgen tooltip "Liever overleggen? Gebruik de chat rechtsonder."

## 4. Chat-affordance zichtbaarder

De chat-widget rechtsonder is nu onopvallend. Toevoegingen:
- Eenmalige tooltip-bubble bij eerste bezoek: *"Vragen of wijzigingen? Stel ze hier — wij reageren snel."* (auto-dismiss na 6s of bij klik).
- In de Hero-kaart een tekstuele verwijzing met 💬-icoon.

## 5. Bevestigings-flow na akkoord

Na klik op "Akkoord op het hele programma":
1. Modal met korte samenvatting (X onderdelen, Y personen, totaal indicatief €Z incl. btw) + "Bevestig akkoord".
2. Na bevestigen: Hero morpht naar success-state, programma-items krijgen sequentiële `fade-in` met groene check-animatie.
3. `ActionRequiredCard` toont nu fase 3: "Wij vragen beschikbaarheid op bij de aanbieders — u hoort binnen 3 werkdagen van ons."

## 6. Sticky mini-status op mobiel

Mobiele bottom bar (al deels aanwezig via `MobileStickyStatus` + `MobileBottomNav`) krijgt in fase 2 één enkele primaire CTA: **"Akkoord geven"**. In fase 3 verandert hij naar "Aanvragen lopen — X/Y bevestigd" met progress.

## 7. Tekstuele opschoning (definitief, geen dubbeling meer)

| Plek | Nieuwe tekst |
|---|---|
| TabHeader (fase 2) | *Voorstel klaar voor akkoord* |
| Hero-kaart titel | *Uw programmavoorstel ligt klaar* |
| Hero-kaart body | zie blok hierboven (één plek, nergens anders herhalen) |
| Item badge Bureau | *Bevestigd door Bureau Vlieland* |
| Item badge Partner fase 2 | *Wacht op uw akkoord* |
| Na akkoord (fase 3) | *Wij vragen nu beschikbaarheid op bij de aanbieders* |

Alle varianten van "verstuurd naar aanbieders" worden uit fase 2 verwijderd.

---

## Technische details (voor de bouwfase)

- **Nieuw component** `src/components/customer-portal/ProposalHeroCard.tsx` — vervangt het fase-2-pad in `ActionRequiredCard` + `ProgramIntroCard`.
- **`ActionRequiredCard`**: behoudt fase 3/4/5 logica, fase 2 pad wordt verwijderd.
- **`ProgramIntroCard`**: behoudt alleen `isMaatwerkEmpty` en `isConfirmed` paden; fase-2 akkoord-UI verhuist naar `ProposalHeroCard`.
- **`ProgramOverviewCard`**: nieuwe `variant="strip"` voor compacte 1-regel weergave in fase 2.
- **`DesktopProgramView` + `MobileProgramView`**: render `ProposalHeroCard` als eerste kind in fase 2; strip-variant van overview eronder; lijst daaronder.
- **`CustomerProgramItem`**: badge-variant per item op basis van `provider_id === 'bureau'` en `quote_status`.
- **Animaties**: bestaande Tailwind utilities (`animate-fade-in`, `hover-scale`, `pulse`); geen nieuwe library nodig.
- **Chat-tooltip**: lichte useEffect + localStorage flag `chat-hint-seen-{token}`.

Geen wijzigingen aan backend, edge functions, e-mails of business logic — puur frontend/UX.

---

## Open punt vóór implementatie

Akkoord met **één primaire CTA "Akkoord op het hele programma"** in fase 2 (i.p.v. de huidige combinatie van bulk-knop in programmakop + losse "Geef akkoord"-knop in IntroCard)? Per-item akkoord blijft mogelijk via het item zelf, maar wordt visueel ondergeschikt.
