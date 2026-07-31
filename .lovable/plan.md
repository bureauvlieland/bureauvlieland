## Wat ik in de data gevonden heb

De 5 meldingen zijn **geen 5 echte gaten** — het zijn twee verschillende problemen:

**1. Zeehondentocht 2026016 (€931,19) en 2026015 (€715,60): factuur is wél geregistreerd.**
Beide inkoopfacturen bestaan in de administratie, op partner Zeehondentochten, status **betaald**, en op de juiste projecten (2026015 → BV-2602-0002, 2026016 → BV-2603-0003). Ze zijn destijds door de admin op projectniveau geregistreerd, dus zonder koppeling aan één specifiek programma-onderdeel. De afwijkingscheck zoekt alleen op die onderdeel-koppeling en ziet daarom niets — een valse melding.

**2. De drie regels met factuurnummer "nvt" (Inzet 4x4, Overtocht, Groepsvervoer, project BV-2602-0006).**
Dit zijn bureau-onderdelen (leverancier "bureau"), waarbij iemand letterlijk "nvt" als factuurnummer heeft ingevuld. Er hoort dus per definitie geen partnerfactuur bij; het veld is misbruikt als opmerking. Ook valse meldingen — maar wel data-vervuiling die opgeruimd moet worden.

Conclusie: er ontbreekt geen enkele factuur. Wat ontbreekt is een betrouwbare check.

## Wat ik ga bouwen

**A. Matching verbreden (einde valse meldingen)**
De check gaat een onderdeel als "gedekt" beschouwen wanneer er een inkoopfactuur bestaat met hetzelfde (genormaliseerde) factuurnummer bij dezelfde leverancier — ook als die factuur op projectniveau of via een verzamelfactuur geregistreerd is. Naast de bestaande koppeling op onderdeel en op allocatie.

**B. Placeholder-nummers dichtspijkeren**
- Database-trigger op programma-onderdelen én logies-offertes: waarden als `nvt`, `n.v.t.`, `n/a`, `-`, `geen`, `x` en leegtekens worden bij opslaan genormaliseerd naar leeg (NULL) in plaats van als factuurnummer bewaard. Zo kan dit nooit meer een afwijking veroorzaken.
- Eenmalige opschoning van de drie bestaande "nvt"-regels in BV-2602-0006 (nummer leegmaken, bedragen blijven staan).
- Invoervalidatie in de admin- en partnerdialogen: een factuurnummer moet minstens één cijfer bevatten, anders een duidelijke melding in plaats van opslaan.

**C. Melding wordt actiegericht**
Het panel toont per regel het projectnummer en de leverancier, plus twee directe acties:
- **Factuur koppelen** — opent de bestaande koppeldialoog om een geregistreerde factuur aan het onderdeel te hangen.
- **Nummer wissen** — maakt het factuurnummer op het onderdeel leeg (met bevestiging), voor gevallen waar geen factuur hoort te bestaan.
Regels die alleen op projectniveau gedekt zijn krijgen geen waarschuwing meer, maar wel een neutrale hint "gedekt via projectfactuur <nummer>" in het detailoverzicht van het project.

**D. Testen**
Uitbreiding van de bestaande suite: matching op nummer+leverancier zonder onderdeel-koppeling, normalisatie van placeholder-nummers, geen false positive voor bureau-onderdelen, en behoud van een echte melding wanneer er werkelijk geen factuurrij bestaat.

## Technische details

- `src/lib/purchaseInvoiceConsistency.ts`: `findOrphanInvoicedItems` krijgt een derde input (factuurrijen met `invoice_number_normalized` + `partner_id`) en een normalisatiehelper `normalizeInvoiceNumberInput` die placeholders als leeg beschouwt.
- `InvoiceConsistencyPanel.tsx`: extra query op `partner_purchase_invoices(invoice_number_normalized, partner_id)`, projectreferentie erbij, en de twee actieknoppen (hergebruik van de bestaande koppel-dialoog).
- Migratie: `BEFORE INSERT OR UPDATE`-trigger `normalize_invoiced_number` op `program_request_items` en `accommodation_quotes`; datafix voor de drie bestaande rijen.
- Geen wijziging aan de commissie-berekening of aan de bestaande sync-triggers.
