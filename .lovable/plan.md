## Ronde 1 — Mobiele weergave klantportaal verbeteren

### Probleemanalyse

Op mobiel (411px) lopen er twee dingen mis in `src/pages/CustomerProgram.tsx`:

1. **Header overloopt.** De header heeft drie knoppen (Delen met deelnemers, Deelnemersweergave, Vernieuwen) naast het logo. Op 411px past dat niet en wordt het een rommelige rij — labels worden afgekapt of duwen het logo weg.
2. **Splash heeft geen navigatie op mobiel.** `ProgramNavigation` wordt alleen gerenderd als `!isMobile`. De `MobileBottomNav` verschijnt pas in event-modus. Resultaat: een mobiele klant op de Splash kan alleen via de twee kaarten (Logies / Programma) doorklikken — de tabs Praktisch, Facturatie en Akkoord zijn onbereikbaar tot je op een tab landt waar de bovenbalk wel zichtbaar is.

Daarnaast nog een paar kleinere mobiele wrijvingen op de Splash (`CustomerPortalSplash.tsx`):
- De `2/3 + 1/3` grid valt netjes terug naar 1 kolom op mobiel — daar gaat het goed.
- De stappenstrip (`grid-cols-2 lg:grid-cols-4`) werkt, maar de cirkelconnector lijn is verborgen op mobiel — prima.
- De fotomosaic mobile scrollstrip is OK.
- De welkom-titel (`text-2xl`) kan op smalle schermen wat compacter; geen blocker.

### Aanpak

**1. Navigatie ook op mobiel tonen**

In `CustomerProgram.tsx` de `!isMobile && (...)` guard rond `ProgramNavigation` weghalen, zodat de tab-balk altijd zichtbaar is (de balk is al horizontaal scrollbaar — `overflow-x-auto` in `ProgramNavigation`). Tijdens event-modus blijft `MobileBottomNav` onderaan staan; de bovenbalk blijft daar ook zichtbaar zodat klanten alle secties (incl. Facturatie/Akkoord) kunnen bereiken.

Optie: tijdens event-modus de bovenbalk op mobiel verbergen om duplicatie met `MobileBottomNav` te vermijden. Voorkeur: bovenbalk laten staan want `MobileBottomNav` toont maar 4 tabs (geen Logies/Facturatie/Akkoord).

**2. Header responsive maken**

De drie knoppen in de header compacter maken op mobiel:
- "Delen met deelnemers" → alleen icoon op `<sm`, label vanaf `sm:`.
- "Deelnemersweergave" → alleen icoon op `<sm`, label vanaf `sm:`.
- "Vernieuwen" → blijft icon-only op mobiel (label is al `lg:hidden`-achtig; nu staat er een label, dat aanpassen naar icon-only op mobiel).
- Logo iets kleiner op mobiel (`h-7 sm:h-8`).
- `gap-2` tussen knoppen behouden, maar op mobiel `gap-1`.
- Aria-labels toevoegen voor de icon-only varianten.

**3. Splash: mobiele finetuning**

In `CustomerPortalSplash.tsx`:
- Welkomstkop: `text-2xl` → `text-xl sm:text-2xl`.
- De gele "werkdocument" notice: padding `p-4` → `p-3 sm:p-4`.
- Contact-rij blijft compact (al `flex-wrap`).
- Geen layoutwijzigingen aan de twee kaarten — die werken al goed op mobiel.

### Bestanden

- `src/pages/CustomerProgram.tsx` — header knoppen responsief, `ProgramNavigation` ook op mobiel renderen.
- `src/components/customer-portal/CustomerPortalSplash.tsx` — kleine mobiele typografie/padding tweaks.

### Verificatie

- Preview op 411px controleren: header past, navigatie zichtbaar op Splash, alle tabs bereikbaar.
- Sanity-check op 375px (kleinste veelvoorkomende telefoon).
- Desktop ongewijzigd.

---

## Ronde 2 — Deelnemersweergave & deelfunctionaliteit (later)

Apart op te pakken na Ronde 1. Mogelijke richtingen om tegen die tijd te bespreken:

- Deel-knop herpositioneren (bv. binnen het Splash-blok of als prominente CTA in praktisch/vandaag, ipv klein in de header).
- Aparte QR-code dialoog voor on-site delen.
- Deelnemerslink optioneel met datumvenster of zonder kostenoverzicht (al zo).
- Deelnemersweergave zelf: betere "vandaag" focus, makkelijker terug naar volledig programma, expliciete "deel deze pagina"-knop.

Hier vraag ik in Ronde 2 eerst om jouw prioriteiten voordat ik bouw.
