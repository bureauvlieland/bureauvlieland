# Antwoord aan Mirjam (BV-2605-0001) + administratieve correctie

## Wat er echt gebeurd is (reconstruieerd uit database, PDF's en bankmutaties)

De klant heeft **5 factuurdocumenten** ontvangen voor één project — vandaar de verwarring:

| Datum | Document | Bedrag | Inhoud |
|---|---|---|---|
| 11 jun | Factuur 001 | € 1.524,75 | Hele programma incl. koffie & gebak, excl. plateservice |
| 19 jun | Factuur 002 (eerste versie) | € 407,40 | Restant: plateservice Doeksen + resterende fees |
| **25 jun** | **Betaling klant** | **€ 1.932,15** | Betaald: "001/002" → **project volledig voldaan** |
| 24 jul | Factuur 002 (tweede versie) | € 1.932,15 | FOUT: bevatte per abuis het volledige projecttotaal opnieuw |
| 26 jul | Creditnota C002 | −€ 1.932,15 | Crediteert de foute 002 |
| 26 jul | Factuur 003 | € 407,40 | "Restant na 001" — maar dat restant was op 25 jun al betaald via de eerste 002 |

**Kern:** koffie & gebak staat maar één keer op een factuur (001). Plateservice is maar één keer gefactureerd (via het restant van € 407,40). De betaling van 25 juni (€ 1.932,15) dekt het volledige projecttotaal. De dubbele 002 en daarna 003 waren een administratieve vergissing — er staat **niets meer open**, ook de plateservice niet (tegenstrijdig met wat Mirjam vermoedt).

Rekenkundig klopt dit exact: € 1.524,75 + € 407,40 = € 1.932,15 = betaald bedrag = projecttotaal.

## Wat we doen

### 1. Antwoordmail aan Mirjam (formeel, 'u'-vorm)

Verstuurd als reply op haar mailthread van 17 aug via het bestaande projectmail-mechanisme (landt automatisch in het communicatiedossier). Concepttekst:

> Betreft: uw vraag over de facturen voor BV-2605-0001 (Teambuilding, 5 juni)
>
> Geachte mevrouw Oostenveld,
>
> Dank voor uw bericht — en u heeft gelijk: het is verwarrend geweest. Graag leg ik uit hoe het zit. Het goede nieuws: er is niets dubbel gefactureerd en er staat niets meer open.
>
> Dit heeft u van ons ontvangen:
> - 11 juni — factuur 001 (€ 1.524,75): het volledige programma, inclusief koffie & gebak aan boord. De plateservice stond hier bewust nog niet op, omdat wij de kosten van Rederij Doeksen toen nog niet definitief hadden.
> - 19 juni — deelfactuur 002 (€ 407,40): het restant, met de plateservice.
> - 25 juni — uw betaling van € 1.932,15 voor beide facturen. Hiermee was het project volledig voldaan.
> - 24 juli — per abuis opnieuw een factuur 002 verstuurd, nu ten onrechte met het volledige projecttotaal. Deze hebben wij volledig gecrediteerd (creditnota C002) en vervangen door factuur 003 (€ 407,40).
>
> Factuur 003 betreft echter hetzelfde restant dat u al op 25 juni heeft betaald. U hoeft dus niets meer te voldoen: wij boeken uw betaling van 25 juni af op factuur 001 en 003, en factuur 003 komt hiermee te vervallen.
>
> Samengevat: koffie & gebak is eenmalig gefactureerd op factuur 001, de plateservice eenmalig via het restant van € 407,40, en uw betaling van 25 juni dekt het volledige projecttotaal. Onze excuses voor de verwarring die de correctieronde van eind juli heeft veroorzaakt.
>
> Met vriendelijke groet, Erwin Soolsma — Bureau Vlieland

### 2. Administratieve correctie in de admin

- Bankbetaling van 25 juni (€ 1.932,15, "Timmerfabriek de Houtmolen") koppelen aan factuur 001 én 003.
- Factuur 001 en 003 op status **betaald** zetten, zodat er geen betaalherinneringen meer uitgaan en het financiële dashboard klopt.
- Geen nieuwe creditnota nodig: de betaling dekt 001 + 003 precies.

## Technisch

- Verzenden via bestaande edge function voor projectmail (reply op de thread, formele 'u', logt in `email_log` + `project_communications`).
- Betalingskoppeling via de bestaande match-logica op `bank_statement_lines` / `bureau_invoices` (status `paid`, `paid_at`).
- Geen code- of schemawijzigingen.
