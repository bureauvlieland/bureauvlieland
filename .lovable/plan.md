# Twee aanpassingen aan de klantpagina

## 1. Overzicht-knop "doet niets" bij 1-daagse programma's

**Diagnose** — In `src/pages/CustomerProgram.tsx` (regel 47, 404) staat:
```
const [activeView, setActiveView] = useState(..."splash");
const effectiveView = !isMultiDay && activeView === "splash" ? "program" : activeView;
```

Voor 1-daagse programma's wordt `splash` (= Overzicht) **forceerbaar vervangen door `program`**. Daardoor:
- Landt de klant direct op "Programma" (zoals jij ziet — by design).
- Maar de Overzicht-knop blijft in beeld én reageert niet zichtbaar bij klikken — dat is **niet** as-designed maar een gevolg.

**Keuze**: voor 1-daagse programma's bestaat geen zinvolle splash-pagina (de splash toont alleen kaarten als doorklikmenu naar dezelfde tabs), dus de schoonste oplossing is **de Overzicht-tab verbergen bij 1-daagse programma's**.

**Wijziging** — `src/components/customer-portal/ProgramNavigation.tsx`:
- Render de Overzicht-knop alleen wanneer `isMultiDay === true` (analoog aan de bestaande Logies-tab).
- Resultaat: bij 1-daagse programma's verdwijnen Overzicht + Logies; klant start op Programma (eerste tab), tabs Programma · Praktisch · Facturatie · Akkoord blijven.

## 2. Bedrijfsnaam groter in beeld op het voorstel

**Huidige situatie** — In `ProgramOverviewCard.tsx` staat de bedrijfsnaam onderaan in een kleine grijze regel ("Voorstel voor **van der Velden Interieur**"). De grote H1 is generiek: "Uw voorstel".

**Wijziging** — `src/components/customer-portal/ProgramOverviewCard.tsx`:

Herschrijf de header zo dat de **bedrijfsnaam de hoofdkop is**:

```
Voorstel voor                            ← klein, eyebrow-label (text-sm muted)
van der Velden Interieur                 ← H1, groot (text-3xl md:text-4xl, font-bold)
#BV-2605-0012   [Maatwerk-badge]         ← bestaande badges
Dit voorstel is speciaal voor jullie     ← bestaande subtitel
samengesteld door Bureau Vlieland.
```

Logica:
- Als `customer_company` aanwezig is → bedrijfsnaam wordt de H1.
- Anders → fallback naar `customer_name`.
- Als beide leeg zijn → fallback naar huidige "Uw voorstel" / "Uw maatwerkprogramma".
- Voor "Boeking bevestigd" status passen we de eyebrow aan ("Programma voor").

De aparte regel onderaan ("Voorstel voor …") vervalt — die info zit nu in de hoofdkop.

Werkt automatisch op zowel desktop als mobile (beide gebruiken dezelfde component). Op mobile valt H1 terug naar `text-2xl` zodat het binnen blijft.

## Niet aangepast
- Splash-pagina zelf (blijft as-is voor multi-day).
- De auto-redirect logica voor event-modus (line 273-274).
- Andere tabs of routes.
