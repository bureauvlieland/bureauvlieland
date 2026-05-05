
## 1. Homepage knop "Bekijk alle bouwstenen" verwijst verkeerd

In `src/components/home/ActivitiesShowcase.tsx` (regel 121) linkt de knop naar `/programma-samenstellen` (= configurator/programma maken). Dit hoort onder de sectie "· 02 — Bouwstenen", dus de knop moet naar de bouwstenen-overzichtspagina.

**Wijziging:** `<Link to="/programma-samenstellen">` → `<Link to="/bouwstenen">`.

---

## 2. Maatwerk als volwaardige derde keuze

### Huidige situatie
De configurator-wizard heeft twee tracks:
- **Laten regelen** → toont eerst voorbeeldprogramma's als "inspiratie", dan een maatwerk intake-formulier
- **Zelf regelen** → leidt naar de bouwer

De gebruiker wil dat klanten direct kunnen kiezen voor "laat Bureau Vlieland het samenstellen" zonder verplicht eerst door templates of de bouwer te moeten. Dat is technisch al deels aanwezig (`MaatwerkIntakeForm` maakt een `program_request` aan met type `maatwerk_zakelijk` / `maatwerk_prive` + customer_token, dus er ontstaat automatisch een contact + project waar je in admin mee verder kunt).

### Wijzigingen

**A. Wizard herstructureren naar 3 duidelijke tracks** (`src/components/configurator/ConfiguratorWizard.tsx`):

```
Stap 1 — Hoe wilt u uw programma samenstellen?
 ┌─────────────────────┬─────────────────────┬─────────────────────┐
 │  Bureau Vlieland    │  Voorbeeld-         │  Zelf samenstellen  │
 │  stelt het samen    │  programma kiezen   │                     │
 │  (aanbevolen)       │                     │                     │
 │  → korte intake     │  → kies template    │  → open bouwer      │
 └─────────────────────┴─────────────────────┴─────────────────────┘
```

- Track **`laten_regelen`** wordt: gelegenheid + personen + datum(s) → direct naar `MaatwerkIntakeForm` (geen verplichte template-tussenstap meer; templates blijven optioneel als "inspiratie" in een later stadium of via de andere track).
- Track **`template`**: gelegenheid + personen + datum(s) → template kiezen → laadt template in bouwer.
- Track **`zelf_regelen`**: personen + datum(s) → lege bouwer.

**B. Skip-knop "Sla over en stel zelf samen"** in de template-stap blijft bestaan zodat de twee laatste tracks onderling switchbaar blijven.

**C. Backend / admin** — geen wijziging nodig: `MaatwerkIntakeForm` schrijft al naar `program_requests` (type maatwerk + bureau_central invoicing) en stuurt mail via `send-program-request` edge function. In admin verschijnt het direct als nieuwe aanvraag in `/admin/projecten` waar je het programma verder kunt invullen.

**D. Homepage CTA** — `HeroEditorial` en `FinalCTA` knoppen "Stel uw programma samen" blijven naar `/programma-samenstellen` wijzen; daar landt de gebruiker nu in de 3-keuze stap.

**E. Ongebruikte component opruimen:** `src/components/configurator/EntryChoice.tsx` wordt nergens geïmporteerd → verwijderen om dubbele logica te voorkomen.

---

## 3. Terminologie consistent maken

Inventarisatie van termen die nu door elkaar gebruikt worden:

| Concept | Huidige varianten | Voorstel (één term) |
|---|---|---|
| Programma laten maken door BV | "Laten regelen", "Maatwerk", "Op maat", "Maatwerk aanvragen" | **"Programma op maat"** (knoppen) / **"Bureau Vlieland stelt het samen"** (uitleg) |
| Klant bouwt zelf | "Zelf regelen", "Stel zelf samen", "Zelf samenstellen" | **"Zelf samenstellen"** |
| Voorbeeld kiezen | "Voorbeeldprogramma", "Template", "Start met een voorbeeld" | **"Voorbeeldprogramma"** |
| Losse onderdelen | "Bouwstenen", "Activiteiten", "Onderdelen" | **"Bouwstenen"** (interne/configurator), **"Activiteiten"** (publieke marketing) — bestaande split houden |
| Hoofd-CTA | "Stel uw programma samen", "Programma samenstellen", "Programma maken" | **"Stel uw programma samen"** |

**Bestanden die worden geharmoniseerd:**
- `Footer.tsx` (regel 164–165): "Maatwerk aanvragen" → "Programma op maat"
- `ConfiguratorWizard.tsx` track-labels en kopteksten
- `HeroEditorial.tsx`, `FinalCTA.tsx`: één CTA-tekst
- `Navigation.tsx` / `MegaDropdown.tsx`: check op afwijkende termen
- `EntryChoice.tsx`: vervalt (zie 2E)

---

## 4. Voorbeeldprogramma's: duplicaten opruimen

Analyse van de 10 gepubliceerde templates:

**Echte duplicaten (3 dagen):**
- **"Complete Eilandervaring"** en **"Eilandbeleving Compleet"** — zelfde duur, ~80% overlap in bouwstenen (Borrel, Café Boven, Fortuna, Italiaans, Vrije tijd, Zeehondentocht, Fietstocht). Namen zijn praktisch synoniemen.
- **"Ontspannen Eilandweekend"** (3d) overlapt sterk met bovenstaande.

**Voorstel:**
- Behouden: **Eilandbeleving Compleet** (heeft Strandspektakel + Grillmaster, breedst).
- Depubliceren (`is_published = false`): **Complete Eilandervaring** en **Ontspannen Eilandweekend** (data blijft bewaard, kan in admin worden hersteld).

**Variant-paren — behouden (intentioneel):**
- "Wellness & Natuur" (2d) ↔ "Wellness & Natuur (3 dagen)" — duidelijke duurvariant.
- "Actieve Eilanddag" / "Chill Eilanddag" / "Eilanddag Compleet" — drie sferen voor dagprogramma, geen duplicaat.
- "Avontuur & Ontspanning" (2d) en "Culinaire Ontdekking" (2d) — eigen profiel.

Wijziging via migratie: `UPDATE program_templates SET is_published = false WHERE id IN ('complete-eilandervaring','relax-and-enjoy-vlieland');`

---

## Technische wijzigingen samengevat

| Bestand | Wijziging |
|---|---|
| `src/components/home/ActivitiesShowcase.tsx` | Knop linkt naar `/bouwstenen` |
| `src/components/configurator/ConfiguratorWizard.tsx` | 3-tracks; maatwerk direct na intake-stap |
| `src/components/configurator/EntryChoice.tsx` | Verwijderen (ongebruikt) |
| `src/components/Footer.tsx` | Term "Maatwerk aanvragen" → "Programma op maat" |
| `src/components/home/HeroEditorial.tsx`, `FinalCTA.tsx` | CTA-tekst uniformeren |
| Migratie | Twee 3-daagse templates depubliceren |

Geen DB-schema-wijzigingen, geen nieuwe edge functions.
