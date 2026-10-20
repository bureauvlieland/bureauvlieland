# Facturen die de gast zelf betaalde, met commissie

Status: gebouwd op 20 oktober 2026, naar de vraag van Erwin: "Ik wil ook
commissie rekenen over facturen die de gast zelf heeft afgerekend, maar die
wel via mij zijn aangeleverd." Migratie `20261020120000`.

## Het probleem

Een rij in `partner_purchase_invoices` betekende tot nu toe twee dingen
tegelijk: de grondslag voor de commissie, én een factuur die Bureau Vlieland
moet doorsturen naar Snelstart en betalen (betaalbatch of incasso). Bij een
boeking die via het bureau loopt maar die de gast rechtstreeks met de partner
afrekent (het hotel factureert de groep zelf, de gast betaalt het diner aan
het restaurant) is alleen het eerste waar. Zo'n factuur kon de partner
nergens kwijt zonder dat het bureau hem als eigen kostenpost ging verwerken,
en dus bleef de regel in de commissiewerklijst op "Inkoopfactuur ontbreekt"
staan en liep het bureau de commissie mis.

Voor logies bestond al een half mechanisme: `excluded_fees = accommodation`
haalt het logies van onze klantfactuur (plan-facturatie-overzicht, 13
oktober), maar het partnerportaal zei daarna nog steeds "Factureer aan Bureau
Vlieland". Voor programma-onderdelen bestond `invoicing_mode = partner_direct`
op projectniveau, maar sinds maart 2026 staat alles op `bureau_central` en de
registratie maakte er geen onderscheid in.

## De regel

Elke geregistreerde factuur draagt nu **aan wie hij gericht was**:

| `billed_to` | Betekenis | Commissie | Snelstart, batch, incasso, bankmatching | Doorbelasten aan de klant |
|---|---|---|---|---|
| `bureau` (default) | factuur aan Bureau Vlieland | ja, over ex btw | ja | ja |
| `customer` | factuur aan de gast, door de gast betaald | ja, over ex btw, precies dezelfde berekening | nooit | nooit |

De commissieberekening verandert niet: de grondslag is de inkoopfactuur ex
btw (`docs/plan-commissiefacturen.md`, besluit 1). Alleen de administratieve
stroom eromheen stopt.

## Waar het staat

- **Database**: `partner_purchase_invoices.billed_to` (`bureau` | `customer`)
  en, omdat een in het portaal geregistreerde logiesfactuur op de offerte
  staat en niet in de inkoopfacturentabel, `accommodation_quotes.invoiced_billed_to`.
  Beide zitten in de partnerguards: een partner mag de vlag na registratie
  niet zelf omzetten (van `customer` naar `bureau` zou het bureau een factuur
  laten betalen die de gast al betaalde). Admin en edge functions wel.
- **Eén regelmodule**: `supabase/functions/_shared/invoiceBilledTo.ts`
  (frontend via `src/lib/invoiceBilledTo.ts`): `isCustomerBilled`,
  `isBureauPayable`, `normalizeBilledTo` en `defaultBilledToForProject`, de
  vooraf ingevulde keuze vanuit het project (`partner_direct` → gast; logies
  met `excluded_fees = accommodation` → gast).

## Partnerportaal

- In de drie factuurdialogen (onderdeel, verzamelfactuur, logies) staat
  bovenaan de keuze **"Aan wie is deze factuur gericht?"**: Bureau Vlieland
  of "De gast, rechtstreeks afgerekend". De keuze staat vooraf goed vanuit het
  project en is altijd om te zetten. Bij "de gast" verdwijnt het
  factuuradres van het bureau en legt een notice uit dat het bureau niets
  betaalt en alleen een commissiefactuur stuurt; de pdf blijft verplicht als
  onderbouwing.
- `register-partner-invoice` en `register-accommodation-invoice` nemen
  `billedTo` aan (ongeldige waarde → 400), slaan de vlag op en maken bij een
  factuur aan de gast géén taak "Inkoopfactuur verwerken"; de commissietaak
  blijft. De mail aan het bureau krijgt een banner "Aan de gast gericht".
- Op Facturatie → Gefactureerd draagt zo'n factuur de pill **Aan de gast**;
  de commissie ernaast is dezelfde als bij een factuur aan het bureau.
  `get-partner-dashboard` leest `billed_to` van de gekoppelde inkoopfactuur
  mee als `invoiced_billed_to` op het onderdeel en geeft bij logies
  `accommodation_billed_directly` door uit het gekoppelde programma.

## Admin

- **Inkoopfacturen** en de kaart op het project: status-pill "Gast betaalde
  rechtstreeks" in plaats van "In afwachting"; de knoppen Doorsturen,
  Markeer als betaald en de doorstuurhistorie zijn weg voor die facturen. Een
  knop (persoonsicoon) zet de vlag om, zolang het bureau nog niets met de
  factuur deed (niet doorgestuurd, niet betaald, niet in een batch). Het
  statusfilter heeft het zicht "Gast betaalde rechtstreeks"; de tegel "In
  afwachting" telt deze facturen niet mee.
- **Inkoopfactuur toevoegen** (ook vanuit de inbox): vinkje "De gast heeft
  deze factuur rechtstreeks aan de partner betaald".
- **Commissiewerklijst**: de regel staat gewoon bij "Te factureren" met de
  grondslag inkoop; pill "Gast betaalde rechtstreeks" (`ReconRow.customerPaid`,
  `ReconRowInvoice.billedTo`). De lader geeft `billed_to` en
  `invoiced_billed_to` door; de werklijst en "Commissiefactuur maken" rekenen
  niets anders.
- **Niet meer in de betaalstroom**: `isForwardableInvoice` is `false`
  (bulk doorsturen slaat ze over), `forward-purchase-invoice` weigert met
  `customer_billed`, `generate-payment-batch` weigert ze, Betaalbatches en
  `match-bank-lines` laden alleen `billed_to = bureau`, en het financieel
  dashboard telt ze niet als inkoop.

## Bewust niet gebouwd

- **Doorbelasten**: het werkblad Doorbelasten op het project toont de regels
  van zo'n factuur nog steeds. Omdat de gast al betaalde, hoort er niets van
  op de klantfactuur. Bij de eerste echte factuur aan de gast met orderregels
  moeten de voorstellen standaard op "niet doorbelasten" komen; tot die tijd
  is dat handwerk in het werkblad.
- **Boekingen die niet in het systeem staan** (een gast die het bureau per
  telefoon naar een hotel doorverwees, zonder project of logiesaanvraag): die
  hebben nog geen plek. De partner kan zo'n factuur alleen kwijt via een
  project; de admin via "Inkoopfactuur toevoegen" op een project. Een losse
  registratie "doorverwezen gast" zonder project is een eigen vraag.
- **Terugwerkend**: bestaande registraties staan allemaal op `bureau`. De
  Seeduyn-logiesfactuur van BV-2602-0005 (door de gast betaald, 13 oktober)
  moet de admin met de omzetknop op "gast" zetten.
