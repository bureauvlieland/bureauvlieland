## Wat er aan de hand is

In `src/pages/admin/AdminInvoicePreview.tsx` wordt de factuurtabel opgebouwd in drie varianten:

1. **Bestaande, al geregistreerde factuur** (`isExistingInvoiceView`, regels 1399–1424 in de preview en regels 647–665 in de PDF-opbouw): er wordt bewust **één regel** gerenderd — "Eindfactuur FV-… / Project BV-…" met het totaalbedrag.
2. **Slot-/termijnmodus**: eveneens één regel ("Slotfactuur project …").
3. **Nieuwe volledige factuur**: de volledige specificatie per categorie (programma-items, logies, extra's, coördinatie & bijdragen).

BV-2606-0022 valt in geval 1: de factuur is al geregistreerd, dus de preview toont de samenvattingsregel. Dat het label nu correct "Eindfactuur" is, verandert die weergave niet.

## Wat ik ga aanpassen

**Regel:** een factuur die het volledige projectbedrag dekt (type resolvet naar `final` én er zijn geen eerdere niet-gecrediteerde termijnen) krijgt altijd de volledige specificatie — ook wanneer hij al geregistreerd is. Deelfacturen, slotfacturen en creditnota's houden de compacte regel, omdat hun bedrag niet 1-op-1 op de items te herleiden is.

Concreet:

- Nieuwe afgeleide waarde `showFullSpecification` in `AdminInvoicePreview.tsx`: waar wanneer `outgoingInvoiceType === "final"` en `priorSumExcludingCurrent ≈ 0`, en niet in creditweergave.
- **Preview (regel ~1399)**: conditie wordt `isExistingInvoiceView && loadedInvoice && !showFullSpecification` voor de samenvattingsregel; anders valt hij door naar de bestaande categorie-render.
- **PDF (regel ~647)**: dezelfde conditie op `loadedInvoiceForPdf`, zodat preview en PDF identiek zijn.
- **Bedragen blijven leidend vanuit de geregistreerde factuur**: de totalen/BTW-regels blijven uit `signedExistingTotals` komen (`buildScaledVatTotals`), zodat de PDF exact het geregistreerde bedrag toont, ook als items daarna licht zijn gewijzigd. Ik voeg een kleine controle toe: wijkt de som van de gespecificeerde regels meer dan €0,02 af van het geregistreerde bedrag, dan valt de weergave terug op de compacte samenvattingsregel (voorkomt een factuur waarvan de regels niet optellen tot het totaal).

## Tests

Uitbreiding van `src/lib/__tests__/bureauInvoiceType.test.ts` of een nieuw testbestand met een pure helper (`shouldShowFullSpecification`) in `src/lib/bureauInvoiceType.ts`:
- eindfactuur zonder eerdere termijnen → volledige specificatie
- deelfactuur → compacte regel
- slotfactuur na eerdere termijn → compacte regel
- creditnota → compacte regel
- eindfactuur met afwijkend bedrag t.o.v. itemtotaal → compacte regel (fallback)
