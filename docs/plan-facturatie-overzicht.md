# Plan: Facturatie-overzicht (`/admin/facturatie`)

Status: beoordeeld en gebouwd op 2 oktober 2026.

## Beoordeling

Wat de pagina nu doet: vier tabs (Klaar, Gedeeltelijk, Losse logies,
Afgerond) met per project één grote kaart. Dat werkt voor drie projecten, niet
voor dertig.

| # | Probleem | Gevolg |
|---|---|---|
| 1 | Elke kaart is ~350px hoog: de volledige specificatie (programma, extra's, logies, toeristenbelasting, natuurbijdrage, opslag, coördinatiekosten) staat altijd open | Je ziet drie projecten per scherm en moet scrollen om te weten wat er speelt |
| 2 | Geen zoeken, geen sorteren, geen kenmerk (referentienummer) | Een bepaald project terugvinden = scrollen en raden |
| 3 | Geen tijdscontext: de datum staat er wel, maar niet of het evenement al geweest is. Dat is dé factuur-trigger | Je weet niet wat het eerst gefactureerd moet |
| 4 | "Doorsturen naar boekhouding" zit verstopt in elke kaart | Een geregistreerde factuur die nooit doorgestuurd is, valt niet op |
| 5 | Twee even zware primaire knoppen per kaart ("Factuur registreren" én "Markeer als afgerond") | Breekt de regel "één primaire actie"; afronden is een zeldzame, risicovolle actie |
| 6 | Drie bovenste tegels herhalen de tabs; "Afgerond" heeft geen aantal; losse logies zit apart met een ander kaartontwerp | Dubbele informatie, inconsistent |
| 7 | Technisch: `RequestCard`, `LodgingCard` en `LodgingSection` zijn binnen de paginacomponent gedefinieerd (remounten bij elke render), totalen worden per kaart en 6× in de dialoog opnieuw berekend | Traag, en open/dicht-status gaat verloren |
| 8 | Losse palettekleuren (`text-green-600`, `bg-amber-100`, …) tegen het ontwerpsysteem in | Design-debt |

## Verbeteringen

1. **Compacte rij per project**: klant, referentie, datum(s) met "3 dagen
   geleden" / "over 5 dagen", personen. Rechts het openstaande bedrag groot,
   met een voortgangsbalk "gefactureerd van totaal". Specificatie en
   geregistreerde facturen zitten achter een uitklapper.
2. **Eén primaire actie**: "Factuur registreren" / "Restant factureren".
   "Markeer als afgerond" wordt een ondergeschikte knop.
3. **Zoeken en sorteren**: zoekveld (klant, bedrijf, referentie, factuurnummer)
   en sortering (evenement eerst voorbij, bedrag, klant).
4. **Nieuw tabblad "Door te sturen"**: alle geregistreerde facturen die nog
   niet naar de boekhouding zijn, met de doorstuurknop direct erbij.
   Projecten met zo'n factuur krijgen ook een waarschuwingspill.
5. **Statuspills** uit het ontwerpsysteem: "Evenement geweest", "Nog te
   komen", "n factuur niet doorgestuurd".
6. **Tegels = filters**: de bovenste tegels zijn de tabs zelf (met aantallen en
   bedragen), geen dubbele informatie meer. Afgerond toont een telling en
   laadt in stappen van 20.
7. **Losse logies** in dezelfde rij-opbouw.
8. **Technisch**: totalen één keer per project in `useMemo`; de dialoog
   rekent alleen voor het gekozen project; kaarten zijn eigen componenten
   in `src/components/admin/invoicing/`; filter/sorteer-logica in
   `src/lib/adminInvoicingView.ts` met unit tests; alleen tokens uit het
   ontwerpsysteem (`Pill`, `EmptyState`, `text-success-ink`, …).

## Bewust niet in deze ronde

- Bulkacties (meerdere facturen tegelijk doorsturen).
- Server-side paginering: het aantal actieve projecten is overzichtelijk.
- Wijzigen van de facturatielogica of totalen (`adminInvoicingTotals.ts`
  blijft ongemoeid).

## Logies buiten de factuur (13 oktober 2026)

Soms rekent de accommodatie het logies rechtstreeks met de klant af (BV-2602-0005,
Strandhotel Seeduyn). Het bureau factureert dan alleen het programma en stuurt het
hotel een commissiefactuur. Daarvoor is `accommodation` een vijfde sleutel in
`program_requests.excluded_fees` (`src/lib/excludedFees.ts`), naast
toeristenbelasting, natuurbijdrage, opslag en coördinatiefee:

- Financieel Overzicht op het project: het kruisje bij de logiesregel haalt
  kamer en extra's van de factuur; terugzetten via "Uitgesloten van factuur".
- Totalen (`adminInvoicingTotals.ts`), factuurvoorbeeld en PDF, het
  facturatie-overzicht en de btw-uitsplitsing laten het logies weg; het telt
  ook niet mee in de grondslag voor de opslag centrale facturatie.
- Klantportaal: de logiesregel blijft staan met "rechtstreeks via de
  accommodatie" in plaats van een bedrag.
- Voltooiingsstatus (`recalculate_program_completion_status`, migratie
  `20261013100000`) rekent het openstaande bedrag zonder logies.
- De commissie op het logies verandert niet: die loopt via de logiesofferte en
  de inkoopfactuur van de accommodatie in de commissiewerklijst.

De migratie zet de sleutel meteen op BV-2602-0005.

## Overige kosten gekoppeld aan inkoopfacturen (14 oktober 2026)

Op grote projecten (BV-2604-0002, BV-2608-0004) kwamen inkoopfacturen van
campings, cateraars en vervoerders op projectniveau binnen, en werden dezelfde
bedragen met de hand als "Overige kosten" overgenomen. Beide bestonden, maar
wisten niets van elkaar: geen controle of de doorberekening de inkoop dekt, en
bij een correctie twee plekken bijwerken.

Een kostenregel (bureau-onderdeel met `day_index` -1) kan nu met
`purchase_invoice_id` naar een inkoopfactuur van het project wijzen. Koppelen
is optioneel; losse kosten en losse facturen blijven werken.

- **Kaart Inkoopfacturen**: een factuur zonder kostenregel krijgt "Opvoeren".
  Die opent het sheet "Kosten toevoegen" met leverancier, omschrijving, bedrag
  en btw-tarief voorgevuld en legt de koppeling. Een gekoppelde factuur toont
  welke kostenregels erop wijzen.
- **Sheet "Kosten toevoegen"**: optioneel veld "Inkoopfactuur" met de facturen
  van het project; een factuur met precies het ingevulde bedrag staat bovenaan.
  Kiezen vult alleen de lege velden. Werkt ook bij bewerken, voor regels die er
  al stonden.
- **Kaart Overige kosten** (`ExtraCostsCard`): kolom Inkoop met factuurnummer
  en bedrag, "gedeeld met n regels" als één factuur meerdere regels dekt, en een
  rode markering met het tekort als de gekoppelde regels de factuur niet dekken.
  Onder de tabel verkoop, gekoppelde inkoop en marge.
- Rekenlogica in `src/lib/extraCostLinks.ts` met Vitest.

De commissiewerklijst verandert niet: een factuur die alleen aan een
bureau-onderdeel hangt telt daar al als projectfactuur.
