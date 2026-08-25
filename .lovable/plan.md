# Antwoord aan Mirjam (BV-2605-0001) + administratieve correctie

## Wat er echt gebeurd is (bevestigd via database, PDF's, bankmutaties én jouw toelichting)

De klant heeft **5 factuurdocumenten** ontvangen voor één project — vandaar de verwarring:

| Datum | Document | Bedrag | Inhoud |
|---|---|---|---|
| 11 jun | Factuur 001 | € 1.524,75 | Hele programma incl. koffie & gebak, excl. plateservice |
| 19 jun | Factuur 002 (eerste versie) | € 407,40 | Restant: plateservice Doeksen + resterende fees |
| **25 jun** | **Betaling klant** | **€ 1.932,15** | Betaald: "001/002" → **project volledig voldaan** |
| 24 jul | Factuur 002 (tweede versie) | € 1.932,15 | FOUT: volledige projecttotaal opnieuw — ontstaan toen we de deelfactuur-versturing aan het inrichten/testen waren; had € 407,40 moeten zijn |
| 26 jul | Creditnota C002 | −€ 1.932,15 | Crediteert de foute 002 |
| 26 jul | Factuur 003 | € 407,40 | Het juiste restant — maar dat was op 25 jun al betaald via de eerste 002 |

**Kern:** koffie & gebak staat maar één keer op een factuur (001). De plateservice is maar één keer gefactureerd (via het restant van € 407,40). De betaling van 25 juni (€ 1.932,15) dekt het volledige projecttotaal — **alles is dus al betaald, ook de plateservice** (anders dan Mirjam vermoedt). De dubbele 002 en daarna 003 waren een administratieve vergissing aan onze kant.

Rekenkundig exact: € 1.524,75 + € 407,40 = € 1.932,15 = betaald bedrag = projecttotaal.

## Wat we doen

### 1. Antwoordmail aan Mirjam (formeel, 'u'-vorm)

Verstuurd als reply op haar mailthread van 17 aug via het bestaande projectmail-mechanisme (landt automatisch in het communicatiedossier). Concepttekst:

> Betreft: uw vraag over de facturen voor BV-2605-0001 (Teambuilding, 5 juni)
>
> Geachte mevrouw Oostenveld,
>
> Dank voor uw oplettendheid — en u heeft gelijk dat het er verwarrend uitziet. Ik heb het volledig uitgezocht en kan u geruststellen: er is niets dubbel gefactureerd, en er staat niets meer open. Uw betaling van 25 juni (€ 1.932,15) dekt het volledige projecttotaal, inclusief de plateservice.
>
> Zo zit het in elkaar:
> - 11 juni — factuur 001 (€ 1.524,75): het programma, inclusief koffie & gebak aan boord. De plateservice stond hier nog niet op, omdat wij de kosten van Rederij Doeksen toen nog niet definitief hadden.
> - 19 juni — deelfactuur 002 (€ 407,40): het restant, met daarin de plateservice.
> - 25 juni — uw betaling van € 1.932,15 voor beide facturen. Hiermee was alles voldaan.
> - 24 juli — door een fout bij het inrichten van onze deelfacturatie is opnieuw een factuur 002 verstuurd, nu ten onrechte met het volledige projecttotaal. Deze hebben wij volledig gecrediteerd (creditnota C002) en vervangen door factuur 003 (€ 407,40).
>
> Factuur 003 betrof echter hetzelfde restant dat u al op 25 juni had betaald. Die factuur komt daarom te vervallen; u hoeft niets meer te voldoen.
>
> Samengevat: koffie & gebak is eenmalig gefactureerd op factuur 001, de plateservice eenmalig via het restant van € 407,40, en uw betaling van 25 juni dekt het totaal. Onze excuses voor de verwarring die de correctieronde van eind juli heeft veroorzaakt — en dank dat u het meldde.
>
> Met vriendelijke groet, Erwin Soolsma — Bureau Vlieland

### 2. Administratieve correctie in de admin

- Banktransactie van 25 juni (€ 1.932,15, "Timmerfabriek de Houtmolen Makkum B.V.", omschrijving "5-0001-001/5-0001-002") markeren als bevestigd gematcht, met notitie dat deze factuur 001 + 003 dekt.
- Factuur 001 en 003 op status **betaald** zetten (met koppeling aan de bankregel), zodat er geen betaalherinneringen meer uitgaan en het financiële dashboard klopt.
- 002 en C002 heffen elkaar al op; die blijven ongemoeid.
- Geen nieuwe creditnota nodig.

## Technisch

- Verzenden via de bestaande projectmail edge function (reply op de thread, formele 'u', logt in `email_log` + `project_communications`).
- Correcties via data-updates op `bureau_invoices` (status betaald + bankregel-koppeling) en `bank_statement_lines` (status bevestigd + notitie). Geen code- of schemawijzigingen.
