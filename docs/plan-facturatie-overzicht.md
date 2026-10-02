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
