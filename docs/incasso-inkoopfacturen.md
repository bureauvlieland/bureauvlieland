# Inkoopfacturen die de partner zelf incasseert

Status: gebouwd op 14 oktober 2026. Geldt nu voor Rederij Doeksen.

## Het probleem

Doeksen incasseert zijn inkoopfacturen zelf. Zo'n factuur hoort dus nooit in
een SEPA-betaalbatch, en "Doorgestuurd" betekent er niet "wacht op batch" maar
"wacht op de incasso op het bankafschrift". Het vlagje daarvoor
(`partners.pays_by_direct_debit`, migratie `20260610`) hield de facturen al uit
de batches, maar was nergens in de admin te zetten en de rest van de stroom
wist er niets van.

Twee smaken bij Doeksen:

| Soort factuur | Commissie | Wat Doeksen incasseert |
|---|---|---|
| Catering (losse inkoopfactuur per project) | niet ingehouden, loopt via de commissiefactuur | het volledige bedrag incl. btw |
| Overtochten (verzamelfactuur) | ingehouden op de factuur, opgeslagen als `supplier_commission_excl_vat` | bruto incl. btw minus de ingehouden commissie ("Netto bedrag" op de PDF) |

## Wat er is gebouwd

- **Partnerpagina**: schakelaar "Betaalt via automatische incasso" onder het
  IBAN-veld. Migratie `20261014120000` zet hem aan voor Doeksen.
- **Inkoopfacturen**: een doorgestuurde factuur van zo'n partner krijgt de pill
  "Incasso". Wijkt het incassobedrag af door ingehouden commissie, dan staat
  dat bedrag erbij, zodat je bij het bankafschrift niet hoeft te rekenen.
  Regels in `src/lib/purchaseInvoiceDirectDebit.ts`.
- **Overige IBAN's** op de partnerpagina (`partners.extra_ibans`, migratie
  `20261014130000`): een partner kan van meerdere rekeningen incasseren of
  betalen. Het IBAN-veld blijft het ene nummer voor de betaalbatches; de
  overige nummers dienen alleen om bankregels te herkennen. De matching kijkt
  naar alle drie: `iban`, het portaal-IBAN `bank_iban` en `extra_ibans`
  (`supabase/functions/_shared/partnerIbans.ts`).
- **Bankmatching** (`supabase/functions/_shared/bankMatching.ts`): een
  uitgaande bankregel past bij een inkoopfactuur als het bedrag gelijk is aan
  het bruto bedrag óf aan bruto minus ingehouden commissie. Klopt daarbij de
  tegenpartij-IBAN met een van de IBAN's van de partner, dan is het een zekere match (95%) en
  wordt hij automatisch voorgesteld, ook zonder factuurnummer in de
  omschrijving. Alleen de IBAN zonder passend bedrag geeft zwakke voorstellen
  (30%) voor alle open facturen van die partner. Bevestigen zet de factuur op
  "Betaald" met de bankregel eraan, zoals al bestond.
- **Verzamelfactuur-sheet**: toont het verwachte incassobedrag en waarschuwt
  als het uitgelezen "Netto bedrag" van de PDF daarvan afwijkt. Dan is er
  iets misgelezen en zou de bankmatching straks op het verkeerde bedrag
  zoeken.

De stroom per factuur blijft: registreren, doorsturen naar de boekhouding (dat
gaat over de administratie, niet over de betaling), wachten, bankregel
matchen. "Markeer als betaald" blijft als handmatige uitweg bestaan.

## Bewust niet gebouwd

- Eén incasso voor meerdere facturen tegelijk: een bankregel koppelt aan één
  factuur. Blijkt Doeksen te verzamelen, dan is het volgende stap om een
  regel aan meerdere facturen te koppelen als de bedragen optellen.
- Een filter "Incasso" in het inkoopfacturenoverzicht.
