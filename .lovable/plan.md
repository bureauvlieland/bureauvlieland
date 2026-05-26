## Doel

Klanten moeten activiteiten op twee manieren kunnen aanvragen, beide vanuit de bouwstenen-pagina:

1. **Toevoegen aan programma** (huidige flow) — meerdaags, ferry/fiets standaard erbij.
2. **Direct aanvragen** (nieuw) — losse activiteit(en) op een gewenste datum/tijd, zonder verplichte ferry & fiets. Daarna nog uitbreidbaar.

Daarnaast: MAP-activiteiten (direct boekbaar aanbod) ook aanvraagbaar maken als ze niet als geplande slot staan.

---

## 1. Bouwstenen-pagina — twee CTA's per kaart

In `src/pages/Bouwstenen.tsx`:

- Vervang de huidige `Toevoegen`-knop door **twee duidelijke acties** per kaart:
  - Primair: **"Direct aanvragen"** → start de losse-aanvraag flow (zie §3).
  - Secundair: **"Toevoegen aan programma"** → huidige `?block=` deeplink naar `/programma-samenstellen`.
- Hover/contrast bug fixen: huidige `variant="ghost" text-primary` levert onleesbare hover op. Gebruik standaard `Button` varianten (`default` + `outline`) met semantic tokens — geen handmatige kleur-classes.
- Zelfde knoppen ook in de detail-`Dialog` onderaan.

Visueel ongeveer:

```text
[ Direct aanvragen ]   [ Toevoegen aan programma ]
```

## 2. MAP-activiteiten als bouwstenen

Op `/activiteiten-boeken` (en in `MapActivityDetailSheet`):

- Als een MAP-activiteit gekoppeld is aan een bestaande building block (via partner/activity_type), voeg in de detail-sheet naast "Direct boeken" óók knoppen toe: **"Direct aanvragen"** en **"Toevoegen aan programma"** → linkt naar dezelfde flow als vanuit Bouwstenen.
- Voor MAP-activity-types zónder bijbehorende building block: tonen we een fallback CTA "Aanvragen op andere datum" die het maatwerk-formulier (`MaatwerkIntakeForm`) opent, voorgevuld met de activiteit-naam en partner. Dit voorkomt dat we MAP-aanbod 1-op-1 als building block moeten dubbelen.

(Backend: geen nieuwe tabellen nodig — we hergebruiken `program_request_items` / maatwerk.)

## 3. Nieuwe "Direct aanvragen" flow (quick request)

Nieuwe route: **`/snel-aanvragen`** (of query-flag op `/programma-samenstellen`, zie technische sectie).

Stappen, opzettelijk uitgekleed:

1. **Selectie** — start met de gekozen bouwsteen in de mini-cart. Klant kan via "Nog een activiteit toevoegen" een lichte versie van `AddActivitySheet` openen om meer bouwstenen toe te voegen. **Geen ferry/fiets auto-toevoegen.**
2. **Wanneer & wie** — compacte versie van `BasicsForm`: 1 datum (default) + optioneel "ik wil ook tijd doorgeven" → tijd per item, aantal personen.
3. **Contact** — hergebruik bestaande `CheckoutContactForm`.
4. **Bevestiging** — hergebruik `CheckoutSuccess`.

Vanuit stap 1 kan een klant doorklikken naar de volledige programma-builder (`/programma-samenstellen`) als ze meerdere dagen willen plannen — cart en datum blijven behouden via `CartContext`.

## 4. Vindbaarheid & navigatie (advies)

- **Hero-CTA** op `/bouwstenen`: naast "Stel programma samen" een tweede prominente CTA "Activiteit los aanvragen".
- **MegaDropdown "Programma's"** (`src/components/navigation/MegaDropdown.tsx`): voeg item toe **"Losse activiteit aanvragen"** → `/bouwstenen` (anchor naar grid) of `/snel-aanvragen`.
- **Homepage** (`src/components/home/...`): in `ActivitiesShowcase` of een nieuwe band laten zien dat losse aanvragen ook kan ("Geen heel programma nodig? Vraag één activiteit aan.").
- Bouwstenen-pagina krijgt boven het grid een korte intro-strook: "Stel een compleet programma samen óf vraag losse activiteiten aan."

---

## Technische sectie

**CartContext aanpassen** (`src/contexts/CartContext.tsx`):
- Nieuw veld `mode: "program" | "quick"` (gepersisteerd).
- Ferry/fiets auto-toevoegen in `ProgrammaSamenstellen.tsx` alleen wanneer `mode === "program"`.
- Bij overstappen quick → program: ferry/fiets alsnog injecteren.

**Nieuwe pagina `src/pages/SnelAanvragen.tsx`**:
- Hergebruikt `CartContext`, `CheckoutContactForm`, `CheckoutSuccess`.
- Eigen lichte builder: lijst van geselecteerde items met inline datum/tijd, `AddActivitySheet`-knop, geen DayTabs/reorder.
- Knop "Uitbreiden tot volledig programma" → `navigate("/programma-samenstellen")` met `mode=program`.

**Bouwstenen kaart-knoppen** (`src/pages/Bouwstenen.tsx`):
- `Direct aanvragen` → `navigate('/snel-aanvragen?block=<id>')`.
- `Toevoegen aan programma` → bestaande `/programma-samenstellen?block=<id>` deeplink (zet `mode=program`).
- Hover-bug: vervang `variant="ghost" className="text-primary hover:text-primary"` door `variant="default"` (primair) en `variant="outline"` (secundair). Geen directe kleur-classes.

**MAP-koppeling**:
- In `useMapActivities` / detail-sheet: lookup of er een building block bestaat met dezelfde `provider_id` + matchende naam/activity_type. Zo ja: bouwsteen-id meegeven aan CTA's. Zo nee: maatwerk-fallback.
- Geen nieuwe edge function nodig; bestaande `program-request` endpoint accepteert al losse items.

**Navigatie**:
- `MegaDropdown` programmas-array uitbreiden met `Losse activiteit aanvragen` (href `/snel-aanvragen`).
- `programmasHrefs` in `Navigation.tsx` aanvullen met `/snel-aanvragen`.

**Reset/draft-recovery**:
- `useProgramDraft` per mode scheiden (key suffix `:quick` vs `:program`) zodat een quick-aanvraag niet je grote programma-concept overschrijft.

**Tests/verificatie**:
- Snel-aanvragen zonder ferry/fiets → indien klant submit, `program_request_items` bevat alleen geselecteerde bouwstenen.
- Overstap quick → program injecteert ferry/fiets en behoudt items.
- Hover op beide knoppen leesbaar in light + (eventueel) dark.

---

## Out of scope (deze ronde)

- MAP-activity-types automatisch als nieuwe building blocks aanmaken in de DB.
- Realtime beschikbaarheidscheck bij quick-aanvraag (blijft offerteproces, geen instant boeking).
- Partner-portal wijzigingen — flow valt op bestaande `program_request_items` structuur.