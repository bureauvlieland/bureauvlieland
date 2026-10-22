# Afhandeling en facturatieroute per onderdeel

Gebouwd 22 oktober 2026, aanleiding: BV-2606-0013 (Swagerman), "Diner in
restaurant Bravoure" bij Hotel Bruin. Reservering doorgegeven, rekening op de
verblijfsnota, programma geweest. In het partnerportaal stond het onderdeel
tegelijk op "Afgesloten (automatisch)" én met een knop "Reageren", plus een
waarschuwing over facturatie die nergens op sloeg. De partner kon het niet
afronden, want afronden betekende een prijs invullen.

## Het probleem

Het partnerportaal kende één afhandelmodel: elk onderdeel is een
offertetraject. Partner bevestigt mét prijs, bureau beoordeelt, partner
factureert aan Bureau Vlieland, auto-close sluit wat open blijft staan als
"afgesloten (automatisch)". Een reservering die de partner zelf op zijn nota
zet, past daar niet in: geen offerte, geen prijs, geen partnerfactuur.

## Twee velden op `program_request_items`

Los van elkaar, want ze gaan over verschillende dingen.

`partner_handling`, wat we van de partner verwachten:

| waarde | betekenis |
|---|---|
| `quote` | offerte of prijs indienen (default, de bestaande flow) |
| `confirm` | alleen bevestigen dat het geregeld is, zonder prijs |
| `inform` | ter kennisgeving, geen actie |

`billing_route`, waar de kosten landen:

| waarde | betekenis |
|---|---|
| `bureau` | factuur van Bureau Vlieland (default) |
| `partner_stay_invoice` | op de verblijfsnota of eigen nota van de partner |
| `customer_direct` | de klant rekent rechtstreeks met de partner af |

Swagerman/Bravoure is `confirm` + `partner_stay_invoice`. Eén bron van
waarheid voor de regels: `supabase/functions/_shared/itemHandling.ts`,
gespiegeld via `src/lib/itemHandling.ts`.

## Wat er per laag veranderde

**Werkbank.** "Maatwerk-item toevoegen" vraagt afhandeling en facturatie. Bij
bevestiging of mededeling is de briefing optioneel en springt de facturatie
naar verblijfsnota. Een mededeling wordt direct met status `confirmed`
aangemaakt, zodat hij nergens als openstaande partneractie telt. In
"Onderdeel bewerken" staan dezelfde twee keuzes voor bestaande
partneronderdelen; die worden direct opgeslagen. In de onderdelenlijst van
een project staan pills voor afwijkende afhandeling en facturatie.

**Partnerportaal.** Drie nieuwe afgeleide statussen in `itemStatus.ts`:
`bevestiging_gevraagd`, `bevestigd`, `ter_kennisgeving`. De klant ziet bij
alle drie "Geregeld". Op de kaart: bij een bevestiging één knop "Bevestigen"
zonder sheet of prijs, bij een mededeling geen knop, bij beide een regel over
de facturatie als die niet via het bureau loopt. Geen prijsregel, geen
"Factuur registreren", geen tekst over verstreken datums. De werkbank van de
partner toont een bevestiging als één rij "Bevestig dat dit geregeld is (geen
offerte nodig)" en laat mededelingen weg. `canPartnerInvoiceItem` is `false`
zodra er geen partnerfactuur verwacht wordt, dus ook de projectstatus komt
niet op "te factureren".

**Edge functions.** `update-partner-item-status` eist alleen een prijs bij een
offerte-onderdeel, weigert reacties op een mededeling, en maakt bij een
bevestiging geen beoordelingstaak voor het bureau en geen statusmail naar de
klant. `send-items-to-partners` zet in de mail per onderdeel of het alleen
bevestigen is of ter kennisgeving, met de facturatienotitie, en laat de
standaard facturatie-alinea weg als geen enkel onderdeel op de bureaufactuur
landt.

**Auto-close.** Onderdelen met `confirm` of `inform` gaan na de laatste
programmadag naar `executed`, nooit naar "afgesloten (automatisch)". Een
bevestiging die de partner nooit bevestigd heeft krijgt een regel in de
projecthistorie ("niet bevestigd door de partner"), zodat het bureau het ziet
en de partner er niet meer mee lastiggevallen wordt.

**Facturen en commissie.** De bureaufactuur (`projectInvoiceSpec`) zet
onderdelen buiten de bureauroute in `offInvoiceItems`: niet op de factuur,
geen "prijs volgt nog". Financieel overzicht en klantportaal tonen ze als
"niet op deze factuur". De commissiewerklijst slaat onderdelen zonder
verwachte partnerfactuur over. Loopt er wel commissie over zo'n post (bij
WestCord valt f&b onder de 10%), dan hoort die in de logiesofferte en de
inkoopfactuur van de accommodatie, niet bij het onderdeel.

## Backfill

De migratie zet alleen BV-2606-0013/Bravoure om en op uitgevoerd. Andere
oude maatwerk-onderdelen die "afgesloten (automatisch)" zijn zonder offerte
en zonder partnerfactuur blijven staan; die zijn per geval via "Onderdeel
bewerken" om te zetten.

## Bewust niet gedaan

- Geen automatische commissie-afspraak per partner voor posten op de
  verblijfsnota. Dat is een partnerafspraak, geen eigenschap van een
  onderdeel.
- Geen aparte reminderteksten voor een bevestiging; de bestaande
  partnerherinnering ("staat nog open") klopt ook daarvoor.
