# Plan: Inkoopfacturen doorbelasten aan de klant (rebuild)

Status: onderzoek en plan 16 oktober 2026, naar aanleiding van de vraag van
Erwin: het bouwen van klantfacturen kost te veel tijd; het koppelen van
orderregels aan programma-onderdelen bij het registreren van een
inkoopfactuur is omslachtig. Gewenst: een inkoopfactuur in zijn geheel aan
een project hangen en daarna op het project "mixen en matchen" met het
programma, met suggesties voor overige kosten, zodat er snel een goede
klantfactuur uit komt. Doorsturen naar Snelstart en de betaalbatch blijven
zoals ze zijn.

Testproject in productie: **BV-2608-0004** (zie hoofdstuk 7; de nulmeting
is op 16 oktober gedaan met alleen-lezen queries op de productiedatabase).

## Samenvatting

De functionaliteit "orderregels 1 op 1 op de eindfactuur" bestaat
(`program_item_billing_lines`, gevuld vanuit `AddPurchaseInvoiceDialog` via
`buildBillingLineRowsByItem`), maar zit op de verkeerde plek: in de
registratiedialoog van de inkoopfactuur, waar je per gescande regel een
onderdeel moet kiezen vóórdat je de factuur mag opslaan. Daardoor:

- is registreren traag (partner, project, per regel een onderdeel, verdeling
  controleren, nummer, datum, PDF-check) en gebeurt het doorbelasten alleen
  als je die hele toewijzing doet;
- kent de dialoog drie toewijzingsblokken (regels toewijzen, verdeling per
  onderdeel, logies) waarvan er één nooit wordt opgeslagen;
- bestaat er geen plek waar je ná de registratie, met het hele programma in
  beeld, beslist wat aan de klant wordt doorbelast;
- rekenen zes plekken het projecttotaal elk anders uit (overzicht op het
  project, facturatiepagina, factuurvoorbeeld, klantportaal, SQL-trigger,
  marge), en gebruiken ze drie verschillende regels voor wanneer
  factuurregels de offerteprijs vervangen;
- heeft de klantfactuur geen eigen regels in de database: alleen een kop in
  `bureau_invoices` en een PDF. Opnieuw openen rekent alles opnieuw uit op de
  actuele projectstand.

Het plan draait het om. Registreren wordt licht: alleen wat de leverancier
stuurt (partner, project als geheel, nummer, datum, bedragen, orderregels).
Daarna komt één nieuw werkblad **Doorbelasten** op het tabblad Financiën van
het project, dat alle inkoopregels van het project naast het programma legt,
per regel een bestemming voorstelt (programma-onderdeel, overige kosten,
niet doorbelasten, logies) en met één bevestiging de klantregels én de
commissieverdeling wegschrijft. De klantfactuur krijgt eigen opgeslagen regels
en één berekening. Snelstart, betaalbatch, statusflow en de commissie-trigger
blijven ongewijzigd.

Verzamelfacturen die meer projecten raken (Doeksen, Fortuna) krijgen één
kop en regels per project (3.5), zodat betaling en Snelstart op de kop
blijven en elk project alleen zijn eigen regels ziet.

De nulmeting op BV-2608-0004 laat de pijn in zijn zuiverste vorm zien: het
project heeft nul programma-onderdelen, geen logiesofferte en vier
inkoopfacturen van samen € 10.055. Er is nu niets om regels aan te koppelen,
dus de klantfactuur zou uit alleen de automatische posten bestaan. Het
werkblad moet daarom ook zonder onderdelen werken (3.3).

Circa 10 bouwdagen in vijf fasen. Fase 1 en 2 geven de tijdwinst; fase 3
maakt de cijfers overal gelijk.

## Voortgang

**Fase 1 (18 oktober 2026), lichte registratie.** `AddPurchaseInvoiceDialog`
is van 2.100 naar ruim 1.100 regels: partner, project, nummer, datum,
orderregels, kop-bedragen, omschrijving en de PDF-controle. Weg zijn het
toewijzen per regel (`LineAssignmentBlock`), de verdeling per onderdeel, het
logiesblok, "Extra projecten" en de checkbox "Direct overnemen"; een factuur
hangt na opslaan alleen aan het project (`item_id` NULL, geen allocaties) en
de orderregels worden altijd bewaard. Staat ons referentienummer op de
factuur, dan is het project vast voorgekozen
(`shouldPreselectProject`, alleen bij `reason === "reference"`); een treffer
op bedrijfs- of klantnaam blijft een klikbare suggestie. Na opslaan één
melding met de knop "Naar project" (Financiën). `PurchaseInvoicesCard` op het
project heeft "Toevoegen" met het project voorgevuld. Lekken gedicht:
verwijderen en opnieuw verwerken halen de klantregels weg van de onderdelen
waar de factuur aan hing en zetten `use_actual_costs` en
`final_billing_locked_at` terug (`purchaseInvoiceCleanup.ts`, met melding
hoeveel onderdelen); "Orderregels boeken" in de inbox-banner slaat regels
met toeristenbelasting over (`isTouristTaxDescription`); het eigen
`vat_rate` van een post zonder bouwsteen telt nu overal mee
(`resolveItemVatRate` in `useItemVatRates`, het factuurvoorbeeld en de
facturatiepagina) en is in de bewerkmodus van "Kosten bewerken" te wijzigen.

Tot fase 2 er is, loopt doorbelasten niet meer via de registratie: de
klantregel-editor op het onderdeel (potlood in het financieel overzicht) en
"Koppelen" op de inkoopfacturenpagina (voor de commissieverdeling) zijn
tijdelijk de enige routes. De nu onbereikbare blokken (`LineAssignmentBlock`,
`LodgingAllocationBlock`, `ExtraProjectSplitBlock`,
`purchaseInvoiceBillingLines.ts`) blijven staan tot fase 4.

## 1. Hoe het nu werkt

```
partner mailt PDF → inbound-purchase-invoice → purchase_invoice_inbox (scan)
                                                        ↓ "Verwerken"
      AddPurchaseInvoiceDialog (2.100 regels, één modal):
        partner → project → [logiesblok: nooit opgeslagen]
        → per orderregel een onderdeel kiezen (LineAssignmentBlock)
        → verdeling per onderdeel × btw (allocatie-editor)
        → extra projecten (splitsen) → nummer, datum → PDF-check → opslaan
                        ↓
      partner_purchase_invoices (kop, status pending)
      purchase_invoice_lines (orderregels, zonder koppeling aan onderdeel)
      partner_purchase_invoice_allocations (per onderdeel × btw)
          ↓ trigger sync_item_invoice_fields → invoiced_*, commission_* op onderdeel
      program_item_billing_lines (alleen als "Direct overnemen" aan stond)
          ↓
      project › Financiën › FinancialOverviewCard → "Factuur Maken"
          ↓ AdminInvoicePreview rekent de specificatie live uit
      bureau_invoices (kop) + PDF in storage → Snelstart (UBL) → bankmatching
```

Parallel daaraan: doorsturen naar Snelstart (`forward-purchase-invoice`,
status `forwarded` wordt door de browser gezet) en de betaalbatch
(`generate-payment-batch`, alleen `forwarded` facturen met een project en een
geldig IBAN). Beide lezen alleen de kop van de inkoopfactuur; ze weten niets
van regels, allocaties of doorbelasting. Dat is precies waarom ze ongemoeid
kunnen blijven.

## 2. Wat er knelt

Bevindingen uit de code; niets is in productie nagelopen.

| # | Knelpunt | Waar |
|---|---|---|
| 1 | Doorbelasten kan alleen tijdens het registreren en alleen als elke regel een onderdeel krijgt. Geen toewijzing = klant houdt de offerteprijs, met slechts een toast als melding. | `AddPurchaseInvoiceDialog.tsx` (LineAssignmentBlock, `copyToBillingLines`) |
| 2 | De onderdeellijst in de dialoog is gefilterd op `provider_id = partner`. Klopt de partner niet met de aanbieder op het onderdeel, dan verschijnen de toewijzingsblokken helemaal niet. Overige kosten (`provider_id 'bureau'`) zijn nooit een doel. | `AddPurchaseInvoiceDialog.tsx:294` |
| 3 | Drie toewijzings-UI's in één modal: regels toewijzen, de allocatie-editor eronder (blijft bewerkbaar, kan uit de pas lopen) en het logiesblok met AI-classificatie dat nooit wordt opgeslagen (`apply-purchase-invoice-to-lodging` heeft geen aanroeper). | idem |
| 4 | Het kop-onderdeel (`item_id`) wordt in de dialoog nooit gezet; de tak "orderregels importeren" in de regeleditor (`link_type === "direct"`) werkt daardoor niet voor facturen uit de dialoog. | `AdminItemBillingLinesEditor.tsx:177` |
| 5 | Toeristenbelasting kan dubbel op de klantfactuur komen: als één regel "toeristenbelasting" is en de rest naar één onderdeel gaat, kopieert `buildBillingLineRowsByItem` tóch alle regels. "Orderregels boeken" in de inbox-banner kopieert altijd alle ruwe scanregels. | `purchaseInvoiceBillingLines.ts:135`, `MatchedRegistrationBanner.tsx:233` |
| 6 | Elke schrijfactie wist eerst álle regels van het onderdeel. Een tweede inkoopfactuur op hetzelfde onderdeel overschrijft de eerste zonder melding. | `AddPurchaseInvoiceDialog.tsx:1023`, `useItemBillingLines.ts:33` |
| 7 | Verwijderen of opnieuw verwerken van een inkoopfactuur laat de klantregels staan. De klant krijgt dan bedragen van een factuur die niet meer bestaat. | `usePurchaseInvoices.ts:260`, `usePurchaseInvoiceInbox.ts:98` |
| 8 | Drie regels voor "wanneer tellen factuurregels": altijd (overzicht, openstaand, SQL-trigger, voorbeeldregels, portaal), alleen bij `use_actual_costs` (facturatiepagina en de totalen van het voorbeeld), alle regels van het project (btw-verdeling bij registreren en in de UBL). Voorbeeld en totaal kunnen van elkaar afwijken. | `adminInvoicingTotals.ts:87`, `FinancialOverviewCard.tsx:133`, `forward-bureau-invoice/index.ts:319` |
| 9 | Overige kosten zijn pseudo-onderdelen (`day_index = -1`, `provider_id 'bureau'`, `admin_price_override` = bedrag incl.). Hun `vat_rate` wordt in overzicht en voorbeeld genegeerd (altijd 21 %), en in de bewerkmodus kun je hem niet wijzigen. Ze zijn niet gekoppeld aan de inkoopfactuur die ze veroorzaakt. | `AdminAddCostSheet.tsx`, `useItemVatRates.ts:40` |
| 10 | Andere routes belasten niet door: "Koppelen achteraf" (`LinkPurchaseInvoiceDialog`) en verzamelfacturen (`finalize-collective-invoice`) maken geen klantregels. Overtochten houden dus de offerteprijs. Een verzamelfactuur zonder project is bovendien onzichtbaar voor de facturenlijst, Snelstart en de batch (`program_requests!inner`). Eén factuurnummer op twee projecten wordt twee kop-rijen (Fortuna 202600127). | `usePurchaseInvoices.ts`, `forward-purchase-invoice`, `generate-payment-batch` |
| 11 | Geen ingang vanaf het project: `PurchaseInvoicesCard` heeft geen "toevoegen" of "koppelen", de inbox geeft geen project mee. Het project wordt altijd met de hand gekozen; de AI-suggestie (referentienummer = score 100) wordt bewust nooit automatisch toegepast. | `AdminPurchaseInvoiceInbox.tsx:295`, `purchaseInvoiceProjectSuggestion.ts` |
| 12 | Zes berekeningen van het projecttotaal: fee engine versus oude schaal, open prijswijziging versus offerteprijs, revisiekosten wel of niet, logies-btw hard op 9. De SQL-trigger leest `coordination_fee_tiers` als `min_people/max_people` terwijl de frontend `{maxPeople, fee}` schrijft. | zie tabel in 3.4 |
| 13 | De klantfactuur is een kop plus PDF. "Restant factureren" vult het volledige projecttotaal voor in plaats van het openstaande bedrag (het effect in `RegisterBureauInvoiceDialog.tsx:182` overschrijft de schaling). De UBL naar Snelstart bouwt zijn regels uit de btw-verhouding van álle regels van het project, niet uit de factuur zelf. | `RegisterBureauInvoiceDialog.tsx`, `forward-bureau-invoice/index.ts:319-417` |
| 14 | "Marge Overzicht" noemt het geraamde totaal "gefactureerd aan klant", telt toeristenbelasting en btw mee als inkoop, en kent geen marge per onderdeel. Na 1-op-1-doorbelasting is de marge per onderdeel per definitie nul; dat is nergens zichtbaar. | `ProjectProfitSummary.tsx`, `AdminRequestDetail.tsx:681` |

## 3. Het nieuwe ontwerp

### 3.1 Uitgangspunten

1. **Een inkoopfactuur hoort bij één project, als geheel.** Registreren legt
   alleen vast wat de leverancier stuurt. Geen onderdelen, geen verdeling.
   Dat maakt registreren in de meeste gevallen twee klikken: project
   bevestigen, opslaan.
2. **Doorbelasten is een aparte, project-brede handeling.** Eén werkblad op
   het project toont alle inkoopregels van alle inkoopfacturen naast het
   programma. Daar beslis je, met suggesties, wat waarheen gaat.
3. **Eén bron voor de klantregels, met herkomst.** Elke klantregel weet uit
   welke inkoopregel hij komt. Verdwijnt de inkoopfactuur, dan verdwijnt de
   klantregel (en andersom zie je in het werkblad wat nog niet is
   doorbelast).
4. **De commissieverdeling is een afgeleide van het doorbelasten.** De
   allocaties per onderdeel × btw worden door het werkblad geschreven, niet
   meer met de hand. Daarmee blijft `sync_item_invoice_fields` en de hele
   commissieflow (`docs/plan-commissiefacturen.md`) ongewijzigd.
5. **Eén berekening van het projecttotaal**, en een klantfactuur met eigen
   opgeslagen regels, net als bij de commissiefacturen (kop en regels
   bevroren, PDF uit de opgeslagen regels).
6. **Snelstart, betaalbatch, statusflow, partnerportaal-registratie en de
   bankmatching blijven ongemoeid.** Ze lezen alleen de kop van de
   inkoopfactuur en die kop verandert niet. De enige uitzondering is de
   join op het project, die voor verzamelfacturen een `left join` wordt
   (3.5).

### 3.2 Registreren (nieuw)

De inbox blijft de ingang. "Verwerken" opent een slanke dialoog:

- **Partner** (uit de scan via IBAN of naam; bestaande logica).
- **Project**: de suggestie op referentienummer (`BV-JJMM-NNNN` in de tekst
  van de factuur, score 100) wordt **voorgekozen**; je bevestigt met opslaan.
  Bedrijfs- of klantnaam (score 60/40) blijft een klikbare suggestie.
- **Nummer, datum, bedragen** en de **orderregels** zoals gescand
  (`buildLinesFromScan`), bewerkbaar. De PDF-totaalcontrole blijft.
- **Weg** uit de dialoog: LineAssignmentBlock, de allocatie-editor, het
  logiesblok, "Extra projecten" en de checkbox "Direct overnemen". Wat ze
  deden, verhuist naar het werkblad (3.3).

Opslaan schrijft kop en `purchase_invoice_lines` (voortaan altijd, ook bij
splitsen) en markeert de inboxregel verwerkt. Status `pending`, zoals nu.
Daarna toont de dialoog één knop: **"Doorbelasten op project …"**, die het
werkblad opent met deze factuur uitgelicht.

Een tweede ingang komt op het project zelf: `PurchaseInvoicesCard` krijgt
"Inkoopfactuur toevoegen" (project al ingevuld) en "Doorbelasten (n regels
open)".

Het partnerportaal (`register-partner-invoice`) blijft per onderdeel
registreren en schrijft allocaties zoals nu; het werkblad toont die regels als
"al gekoppeld door partner" en biedt alleen nog het doorbelasten aan.

### 3.3 Werkblad "Doorbelasten" op het project

Plaats: tabblad Financiën, boven het financieel overzicht. Eén scherm, geen
modal-in-modal. Links de inkoopregels, rechts het programma.

**Links: inkoopregels** van alle inkoopfacturen met `request_id` = dit
project, gegroepeerd per factuur (partner, nummer, datum, totaal, status-pill
van de factuur). Per regel: omschrijving, aantal, bedrag excl., btw, incl. en
de **bestemming**:

| Bestemming | Betekenis | Wat er wordt geschreven |
|---|---|---|
| Programma-onderdeel | Regel vervangt (deel van) de offerteprijs van dat onderdeel | klantregel op het onderdeel + allocatie onderdeel × btw |
| Overige kosten | Regel wordt een eigen kostenpost op de factuur, met de btw van de regel | overige-kostenpost met bron = deze regel, + klantregel |
| Logies-offerte | Regel is kamer of extra bij de gekozen logiesofferte | via `apply-purchase-invoice-to-lodging` (bestaat al, krijgt eindelijk een aanroeper), fase 2b |
| Niet doorbelasten | Bureau draagt dit zelf (toeristenbelasting die het bureau al rekent, bureaukosten, korting) | `purchase_invoice_lines.charge_status = 'skipped'` met reden; telt niet in allocaties en commissiegrondslag |
| Ander project | Regel hoort elders (de huidige "extra projecten"-splitsing) | deelfactuur op het andere project, zoals nu |

Elke regel begint als **voorstel** van de matcher (hoofdstuk 4), met een
zekerheid en een reden ("bedrag gelijk aan offerte", "enige onderdeel van
deze partner", "datum 12 aug = dag 2"). Zekere voorstellen staan aangevinkt,
waarschijnlijke niet. Eén knop **"Bevestig voorstellen (n)"** schrijft alles
in één keer; per regel kun je de bestemming wijzigen in een select met
zoekveld.

**Rechts: het programma** per dag, per onderdeel: partner, offerteprijs
incl., **werkelijk** (som van de doorbelaste regels), verschil, commissie.
Onderdelen zonder inkoopregel staan grijs met "offerteprijs". Per onderdeel
een schakelaar **"Offerteprijs houden"** voor het geval de huisregel niet
geldt (besluit 1). Onderaan: logies, overige kosten, en de automatische
posten (coördinatie, toeristenbelasting, natuurbijdrage, opslag) zoals het
overzicht ze nu kent.

Onder beide kolommen: **"Nog te verwerken: n regels, € x"** en het
projecttotaal volgens de ene berekening (3.4), met de knop "Factuur maken"
die pas primair wordt als er niets meer open staat.

Gedrag:

- Een klantregel die uit een inkoopregel komt is **niet los bewerkbaar**;
  je past de inkoopregel aan of kiest een andere bestemming. Handmatige
  klantregels (zonder bron) blijven mogelijk voor de uitzondering.
- Een tweede inkoopfactuur op hetzelfde onderdeel voegt regels **toe**;
  niets wordt stil overschreven.
- Verwijderen of opnieuw verwerken van een inkoopfactuur verwijdert de
  afgeleide klantregels en allocaties (database, `ON DELETE CASCADE`) en zet
  het onderdeel terug op de offerteprijs. Is er al een klantfactuur
  geregistreerd die die regels bevat, dan weigert de app met een melding.
- **Project zonder programma-onderdelen** (BV-2608-0004: kampeerterrein,
  maaltijden, bagagevervoer, Staatsbosbeheer, alles zonder onderdeel): het
  werkblad werkt dan als lijst. Elke inkoopregel wordt standaard een
  klantregel **zonder onderdeel**, gegroepeerd per inkoopfactuur (partner
  als kopregel op de factuur: "Kampeerterrein Stortemelk, factuur 26013731"
  met de regels eronder), met de btw van de regel. De matcher doet alleen
  nog "niet doorbelasten" (de regel Toeristenbelasting € 704,34 van
  Stortemelk, omdat het bureau zelf 153 × 3 × tarief rekent) en de
  naamsuggestie. Zo wordt de klantfactuur in één bevestiging gebouwd uit de
  inkoopfacturen, wat precies de vraag van Erwin is.
- Verzamelfacturen over meerdere projecten: zie 3.5. Het werkblad van een
  project toont de regels van dat project, ook als de factuur zelf op een
  ander of op geen project staat.

### 3.4 Eén berekening en een factuur met regels

Nieuwe module `src/lib/projectInvoiceSpec.ts`, met tests, die uit het
project (onderdelen, klantregels, logies, overige kosten, `excluded_fees`,
`fee_snapshot`, revisiekosten) de volledige specificatie bouwt: regels,
btw-groepen, totaal. Regel: **klantregels aanwezig = klantregels leidend**;
de vlag `use_actual_costs` vervalt. Deze ene functie wordt gebruikt door:

| Plek | Nu | Straks |
|---|---|---|
| Financieel overzicht op het project (`FinancialOverviewCard`) | eigen rekenwerk, oude feeschaal | `projectInvoiceSpec` |
| Facturatiepagina (`adminInvoicingTotals`) | fee engine, `use_actual_costs` | `projectInvoiceSpec` |
| Factuurvoorbeeld en PDF (`AdminInvoicePreview`) | eigen rekenwerk, open prijswijziging | `projectInvoiceSpec` |
| Klantportaal (`get-customer-program`, `PriceSummaryCard`) | eigen rekenwerk in de browser | `projectInvoiceSpec` via `_shared` in de edge function |
| Marge Overzicht | geraamd totaal als "gefactureerd" | echt gefactureerd (uit `bureau_invoices`) naast geraamd, marge per onderdeel |
| SQL `recalculate_program_completion_status` | eigen SQL-berekening met oude schaal | leest `program_requests.invoice_spec_total_incl_vat`, dat de app wegschrijft bij elke wijziging in het werkblad of overzicht |

De klantfactuur krijgt regels: tabel `bureau_invoice_lines` (zie 5). Bij
"Factuur registreren" en "Verstuur naar klant" worden de regels van de
specificatie (of bij een deel- of slotfactuur: de ene samenvattende regel
plus de btw-groepen van het openstaande bedrag) **bevroren** in de factuur.
PDF en UBL naar Snelstart komen daarna uit de opgeslagen regels, zoals
`renderAndStoreCommissionInvoicePdf` dat voor commissiefacturen al doet.
Daarmee verdwijnt ook de ratio-truc in `forward-bureau-invoice` en de
`vat_breakdown`-jsonb. Bestaande facturen zonder regels blijven leesbaar via
hun PDF; het voorbeeld toont voor die facturen de samenvattende regel, zoals
nu.

### 3.5 Verzamelfacturen over meerdere projecten

Twee soorten komen voor in de data:

- **Rederij Doeksen**: één factuur (3263242, € 6.059) met negen boekingen
  voor drie projecten plus een interne boeking. Vandaag: `request_id` NULL,
  `is_collective`, boekingen in `partner_purchase_invoice_ticket_matches`,
  alleen `partner_purchase_price` op het onderdeel, geen klantregels. De
  factuur is onzichtbaar voor de facturenlijst, voor Snelstart en voor de
  batch, omdat die alle drie `program_requests!inner` joinen;
  `finalize-collective-invoice` zet hem daarom zelf op `forwarded`.
- **Fortuna** (202600127, Gasunie € 659 en Thuisproeverij € 160): één
  factuurnummer als twee kop-rijen op twee projecten. Dat is de huidige
  "extra projecten"-splitsing. Gevolg: twee betalingen aan de partner voor
  één factuur, twee boekingen in Snelstart met hetzelfde nummer, een
  uitzondering in de uniciteitsindex en geen orderregels bij de hoofdrij.

Voorstel: **één factuur is één kop; de regels dragen het project.**

- `purchase_invoice_lines.request_id` (nieuw) zegt bij welk project een
  regel hoort. Staan alle regels op één project, dan staat dat ook op de
  kop. Anders is de kop `is_collective` met `request_id` NULL.
- **Verdelen** gebeurt op de inkoopfactuur zelf (inkoopfacturenpagina en
  direct na registreren): per regel een project, met suggesties uit de
  regeltekst (referentienummer, klantnaam, datum ↔ projectdata; dezelfde
  `suggestProjectFromText`, maar per regel) en bij Doeksen uit de
  boekingsreferentie, zoals `parse-collective-invoice` die nu al oplevert.
  `CollectiveInvoiceSheet` wordt deze verdeelstap; de boekingskolommen
  (`booking_reference`, `departure_date`, `match_status`) verhuizen naar
  `purchase_invoice_lines`, en `partner_purchase_invoice_ticket_matches`
  vervalt na migratie.
- Daarna ziet elk project in zijn werkblad alleen zijn eigen regels en
  belast ze door zoals elke andere regel. Allocaties per onderdeel werken
  al over projecten heen (het onderdeel kent zijn project), dus de
  commissie-trigger verandert niet. De commissiewerklijst groepeert "losse
  inkoopfactuur" nu per kop-project; die moet regels zonder onderdeel per
  `request_id` van de regel gaan groeperen (kleine aanpassing in
  `get-commission-reconciliation`).
- **Betaling en Snelstart blijven op de kop**: één betaling, één boeking.
  Daarvoor moeten `forward-purchase-invoice`, `generate-payment-batch`, de
  kandidatenquery in `AdminPaymentBatches` en `usePurchaseInvoices` hun
  `program_requests!inner` een `left join` maken en bij een verzamelfactuur
  "Verzamel: BV-…, BV-…" tonen (projecten uit de regels). De
  betalingsomschrijving wordt dan `Factuur {nummer} - verzamel`. Dat is de
  enige wijziging aan die twee functies; de kop en de statussen blijven
  gelijk. De incasso-afhandeling van Doeksen
  (`docs/incasso-inkoopfacturen.md`) rekent al op de kop en verandert niet.
- De twee bestaande Fortuna-rijen blijven staan als historie; de
  "extra projecten"-splitsing verdwijnt uit de registratiedialoog.

## 4. Matchregels

Puur en getest in `src/lib/purchaseLineMatcher.ts`. Invoer: de inkoopregels
van één factuur (partner bekend), de onderdelen van het project (met
`provider_id`, `block_name`, dag, aantal personen, `quoted_price`, btw), de
logiesofferte, en de al bestaande bestemmingen. Uitvoer per regel: een
gesorteerde kandidatenlijst met score en reden.

Kandidaten voor een regel zijn de onderdelen met `provider_id` = partner van
de factuur, plus de geselecteerde logiesofferte van die partner. Scores
(worden opgeteld, maximum telt):

| Signaal | Score | Toelichting |
|---|---|---|
| Partner heeft precies één onderdeel in het project | +40 | alle regels daarheen |
| Som van alle regels van de factuur ≈ offerteprijs van één onderdeel (±2 % of €2) | +40 | factuur als geheel op één onderdeel |
| Bedrag van de regel incl. ≈ offerteprijs van het onderdeel | +50 | |
| Datum in de omschrijving = uitvoeringsdag van het onderdeel | +20 | "12-08", "12 aug", "12/8" |
| Woordoverlap omschrijving ↔ `block_name` / activiteitnaam (genormaliseerd, zonder stopwoorden) | +10 per woord, max +30 | "zeehondentocht", "lunch", "bbq" |
| Aantal in de regel ≈ aantal personen van het onderdeel (±10 %) | +15 | |
| Regel bevat `toeristenbelasting`, `verblijfsbelasting`, `tourist tax` | → "Niet doorbelasten" | bureau rekent zelf toeristenbelasting op de factuur |
| Regel bevat `borg`, `servicekosten`, `bezorg`, `fooi`, `schade`, `extra`, `nacalculatie` en matcht geen onderdeel | → "Overige kosten" | btw van de regel |
| Geen kandidaat boven de drempel | → "Overige kosten" | omschrijving van de regel als naam |

Drempels: ≥ 80 **zeker** (aangevinkt), 50–79 **waarschijnlijk** (voorgesteld,
niet aangevinkt), < 50 overige kosten. Een onderdeel dat al door het
partnerportaal gekoppeld is (allocatie aanwezig) krijgt +60 voor regels van
dezelfde factuur.

Bewust **geen** AI in de eerste versie: de signalen hierboven dekken de
gewone gevallen (één partner, één of twee onderdelen, bedrag gelijk) en zijn
uitlegbaar in het scherm. Blijkt na een maand dat te veel regels op
"waarschijnlijk" of "overige kosten" blijven hangen, dan is de volgende stap
een edge function `classify-purchase-invoice-lines` naar het voorbeeld van
`classify-lodging-invoice-lines` als tweede laag voor de restregels.

## 5. Datamodel

Minimaal, om statusflow, commissie, Snelstart en batch intact te laten.

**`purchase_invoice_lines`** (bestaat): `+ request_id` (FK
`program_requests`, het project van de regel; bij een gewone factuur gelijk
aan de kop), `+ charge_status` (`open` | `charged` | `skipped`, default
`open`), `+ skip_reason` (text), en voor verzamelfacturen
`+ booking_reference`, `+ departure_date`, `+ match_status` (overgenomen uit
`partner_purchase_invoice_ticket_matches`, die daarna vervalt). `charged`
wordt afgeleid: er bestaat een klantregel met deze bron. Migratie: bestaande
regels krijgen de `request_id` van hun kop; de negen Doeksen-boekingen
worden regels.

**`program_item_billing_lines`** (bestaat, wordt "klantregels"):
`+ request_id` (FK, zodat regels zonder onderdeel mogelijk zijn, zoals bij
BV-2608-0004; `item_id` wordt nullable), `+ purchase_invoice_line_id` (FK,
`ON DELETE CASCADE`), `+ purchase_invoice_id` (FK, `ON DELETE CASCADE`),
`+ source` (`purchase_invoice` | `manual`), `+ kind` (`program` |
`extra_cost` | `direct`; `direct` is een regel zonder onderdeel, op de
factuur gegroepeerd onder de partner en het factuurnummer). Migratie: bestaande regels krijgen `source = 'manual'` en
`request_id` uit het onderdeel; `use_actual_costs` wordt op de bestaande
rijen genegeerd en daarna verwijderd; `final_billing_locked_at` blijft als
"definitief"-stempel.

**Overige kosten**: blijven items met `day_index = -1` (portaal, PDF,
categorie-indeling en voltooiingsstatus kennen ze al), maar worden vanuit het
werkblad aangemaakt met een klantregel erbij die de bron kent. Hun
`vat_rate` wordt overal gerespecteerd (`useItemVatRates` valt niet meer terug
op 21 als het item een eigen tarief heeft). `AdminAddCostSheet` blijft voor
de handmatige post.

**`partner_purchase_invoice_allocations`** (bestaat): ongewijzigd; wordt
voortaan door het werkblad geschreven uit de bevestigde bestemmingen
(onderdeel × btw). De trigger `sync_item_invoice_fields` blijft de
commissievelden vullen.

**`bureau_invoice_lines`** (nieuw, fase 3): `invoice_id` (FK
`bureau_invoices`, CASCADE), `sort_order`, `description`, `quantity`,
`unit_price_excl_vat`, `vat_rate`, `amount_excl_vat`, `vat_amount`,
`amount_incl_vat`, `item_id` (nullable), `kind` (`program` | `extra_cost` |
`lodging` | `fee` | `summary`). Guard-trigger: regels van een factuur met
status `forwarded` of `paid` zijn bevroren, net als bij
`commission_invoice_lines`.

**`program_requests`**: `+ invoice_spec_total_incl_vat`,
`+ invoice_spec_updated_at`, geschreven door de app; de SQL-trigger voor
`completion_status` gaat die kolom lezen in plaats van zelf te rekenen.

Wat **niet** verandert: `partner_purchase_invoices` (kop, statussen
`pending` / `pending_email_match` / `forwarded` / `paid`, `request_id`,
`payment_batch_id`, `refund_pending_at`), `payment_batches`,
`purchase_invoice_reconciliation_findings`, de partner-guards, de
commissietabellen. De enige aanpassing aan Snelstart en batch is de `left
join` op het project voor verzamelfacturen (3.5).

## 6. Fasen

| Fase | Inhoud | Dagen |
|---|---|---|
| 0 | Besluiten (hoofdstuk 8), meting op productie: hoeveel inkoopfacturen zonder allocatie, hoeveel onderdelen met klantregels, hoeveel overige-kostenposten; controle van BV-2608-0004 | 0,5 |
| 1 | **Lichte registratie.** Dialoog terugbrengen tot partner, project (voorgekozen op referentienummer), nummer, datum, bedragen, regels, PDF-check. Orderregels altijd opslaan. Toewijzingsblokken, logiesblok, extra projecten en de copy-checkbox eruit. Ingang vanaf het project. Lekken dichten die los van het werkblad al fout zijn: klantregels en allocaties mee verwijderen bij verwijderen/opnieuw verwerken, dubbele toeristenbelasting, btw van overige kosten. | 1,5 |
| 2 | **Werkblad Doorbelasten** met de matcher (lib + tests), bestemmingen, bevestigen in één transactie (databasefunctie `apply_purchase_line_charges`: klantregels + allocaties + `charge_status` + overige-kostenposten), per onderdeel "offerteprijs houden", "nog te verwerken"-teller, marge per onderdeel. Migratie van 5 (klantregels, inkoopregels). | 3 |
| 2b | **Verzamelfacturen** (3.5): `request_id` op de regel, verdeelstap per regel met suggesties, `CollectiveInvoiceSheet` daarin opgaan, `left join` in Snelstart, batch en facturenlijst, commissiewerklijst per regelproject; logies-offerte als bestemming (via `apply-purchase-invoice-to-lodging`) | 2 |
| 3 | **Eén berekening** (`projectInvoiceSpec`) op alle zes plekken; `use_actual_costs` weg; `bureau_invoice_lines` met bevriezen bij registreren/versturen; PDF en UBL uit opgeslagen regels; "Restant factureren" vult het openstaande bedrag; SQL-trigger leest het opgeslagen totaal | 2,5 |
| 4 | **Opruimen**: `LineAssignmentBlock`, allocatie-editor, `LodgingAllocationBlock` in de dialoog, `ExtraProjectSplitBlock`, "Orderregels boeken" in `MatchedRegistrationBanner`, `AdminItemBillingLinesEditor`-popover (wordt een link naar het werkblad), `purchaseInvoiceBillingLines.ts`, `purchaseInvoiceLineAssignment.ts`, `vat_breakdown`; documentatie; roadmap | 0,5 |

Totaal circa 10 bouwdagen. Na fase 1 en 2 is de dagelijkse tijdwinst er; fase
3 is nodig om de cijfers op project, facturatiepagina, voorbeeld en portaal
gelijk te krijgen en kan als aparte PR-reeks.

Elke fase is een eigen branch met preview (`docs/werkwijze.md`); fase 2 en 3
bevatten migraties en gaan dus via "Deploy Supabase".

## 7. Testproject BV-2608-0004

Erwin noemt BV-2608-0004 als productieproject om dit op te testen.

### Nulmeting (16 oktober 2026, alleen-lezen op productie)

Stedelijk Gymnasium Haarlem, 153 personen, 15 t/m 18 september,
`bureau_central`, voorwaarden geaccepteerd 2 oktober, status
`ready_for_invoice`, `fee_snapshot` aanwezig, geen uitgesloten posten.

| Wat | Stand |
|---|---|
| Programma-onderdelen | **0** (ook geen overige kosten) |
| Logiesofferte | geen |
| Klantregels (`program_item_billing_lines`) | 0 |
| Klantfacturen (`bureau_invoices`) | 0 |
| Inkoopfacturen | 4, samen € 10.055 incl.; drie `forwarded` (2 oktober), één `pending` (Staatsbosbeheer, 16 oktober, de factuur die Erwin net verwerkte) |
| Allocaties | 0; alle vier hangen alleen aan het project |

De inkoopregels:

| Partner, nummer | Regels | Bijzonderheid |
|---|---|---|
| Kampeerterrein Stortemelk 26013731, € 6.346 | Toeristenbelasting € 704,34 (0 %), Verblijfskosten € 4.219,80 (9 %), Reserveringskosten € 16,20 (21 %), Inzet personeel + tenthuur € 1.406 (21 %) | kop `vat_rate` 0 ("gemengd"); de toeristenbelastingregel mag niet naar de klant, het bureau rekent zelf 153 × 3 × tarief |
| De Bolder 26.000018, € 2.866 | 3 × "Vega maaltijd met toetje" 91 stuks à € 9,63 (9 %), per dag 15-9, 16-9, 17-9 | datum per regel, aantal 91 ≠ 153 |
| Bagagevervoer Vlieland 2026-0137, € 765 | één regel "BTW 21%" € 632,23 | de scan vond geen orderregels en nam de btw-uitsplitsing als regel; omschrijving is onbruikbaar voor de klant, de kop-omschrijving ("Bagagevervoer groepstarief … (153 x)") wel |
| Staatsbosbeheer 33035715, € 77 | Eindschoonmaak € 50, Tientje voor de Natuur € 9,99, Administratiekosten € 17,50 (21 %) | typisch "overige kosten" |

Gevolg voor vandaag: zonder onderdelen bestaat het projecttotaal in het
overzicht, de facturatiepagina en het factuurvoorbeeld alleen uit de
automatische posten (coördinatie, toeristenbelasting, natuurbijdrage,
opslag). "Factuur maken" zou een factuur zonder de € 10.055 opleveren;
de enige weg is nu per regel een overige-kostenpost met de hand aanmaken.

Breder beeld (productie, 16 oktober): van de 19 volledig gefactureerde
projecten in 2026 hadden er 13 klantregels uit inkoopfacturen en 2 helemaal
geen onderdelen; van de 66 inkoopfacturen hangen er 17 alleen aan een
project, 45 hebben allocaties (alle 25 partnerregistraties, 20 van de 41
admin-registraties). Er zijn 80 klantregels op 25 onderdelen, waarvan er
maar 23 op een onderdeel met `use_actual_costs` staan (knelpunt 8 in de
praktijk). 35 overige-kostenposten, 4 met een ander tarief dan 21 % dat
in het overzicht wordt genegeerd (knelpunt 9).

### Acceptatiescenario

Uit te voeren op een preview (let op: previews schrijven in de echte
database).

1. **Nulmeting** is gedaan (hierboven); herhaal de drie totalen (overzicht,
   facturatiepagina, voorbeeld) vlak voor de test.
2. **Fase 1**: registreer de nieuwe inkoopfactuur van Erwin ("net verwerkt")
   via de inbox; het project moet voorgekozen staan op referentienummer; na
   opslaan verschijnen de orderregels bij het project onder "nog te
   verwerken".
3. **Fase 2**: open het werkblad; het project heeft geen onderdelen, dus
   alle 11 regels staan als klantregel zonder onderdeel, gegroepeerd per
   partner. Controleer dat (a) Toeristenbelasting € 704,34 op "niet
   doorbelasten" staat en het bureau zijn eigen toeristenbelasting
   (153 × 3 × tarief) rekent, (b) de regel "BTW 21%" van Bagagevervoer de
   kop-omschrijving als naam voorstelt, (c) de btw per regel (0/9/21) klopt
   in de btw-groepen, (d) de Staatsbosbeheer-regels als overige kosten
   staan, (e) het totaal na bevestigen € 9.350,99 aan doorbelaste inkoop
   plus de automatische posten is, (f) de commissiewerklijst de vier
   facturen als "losse inkoopfactuur" van dit project kent.
   Herhaal daarna op een project mét onderdelen (bijvoorbeeld BV-2606-0013,
   8 onderdelen, nog zonder inkoopfacturen) om de matcher te zien werken.
4. **Fase 3**: "Factuur maken" toont hetzelfde totaal als het overzicht en de
   facturatiepagina; registreren slaat regels op; de PDF en de UBL naar
   Snelstart komen uit die regels; het klantportaal toont dezelfde
   specificatie.
5. **Ongewijzigd**: doorsturen van de inkoopfactuur naar Snelstart en
   opnemen in een betaalbatch werken als voorheen (status `forwarded` →
   batch → `paid`).

## 8. Besluiten voor Erwin

1. **Huisregel.** Blijft "werkelijke inkoop vervangt de offerteprijs, 1 op 1
   zonder opslag" de standaard, met per onderdeel de uitzondering
   "offerteprijs houden"? Of moet er een optionele opslag (procent of
   bedrag) per regel komen? Het plan gaat uit van het eerste; een opslag is
   later een kolom op de klantregel.
2. **Toeristenbelasting op inkoopfacturen** altijd "niet doorbelasten"
   (het bureau rekent zelf `tourist_tax_pp_per_day`)? Nu is dat de bedoeling
   maar lekt het in één geval door (knelpunt 5).
3. **Overige kosten automatisch** laten voorstellen uit niet-gematchte
   regels, met de omschrijving van de leverancier als naam? Of altijd eerst
   een naam laten kiezen?
4. **Project automatisch voorkiezen** bij een referentienummer in de factuur
   (zoals voorgesteld), of ook direct opslaan zonder dialoog als scan,
   partner en project alle drie zeker zijn?
5. **Logies en verzamelfacturen** in hetzelfde werkblad (fase 2b, 1 dag) of
   voorlopig via de bestaande routes?
6. **Klantfactuur bevriezen** in eigen regels (fase 3). Bestaande facturen
   houden alleen hun PDF; akkoord?
7. **Partnerportaal**: partners registreren nu per onderdeel en de
   allocatie telt meteen voor de commissie. Zo laten (plan), of partners ook
   op projectniveau laten registreren en de verdeling altijd door het bureau
   laten doen?
8. **Verzamelfacturen**: één kop met regels per project (plan, 3.5), met de
   kleine `left join`-aanpassing in Snelstart en batch? Of de huidige
   splitsing in losse kop-rijen per project houden, met twee betalingen en
   twee boekingen voor één factuur?
9. **Projecten zonder onderdelen** (BV-2608-0004 en 2 van de 19
   gefactureerde projecten): is dat een bewuste werkwijze voor grote groepen
   die buiten de wizard om zijn geregeld? Dan is de lijstmodus van het
   werkblad (3.3) de hoofdroute, geen uitzondering.

## 9. Bewust niet in dit plan

- Wijzigen van de commissieberekening of -flow; het werkblad voedt alleen de
  allocaties die de bestaande trigger al leest.
- Wijzigen van de statussen van inkoopfacturen, de bankmatching of de
  incasso-afhandeling (`docs/incasso-inkoopfacturen.md`).
  `forward-purchase-invoice` en `generate-payment-batch` veranderen alleen
  in de join op het project (3.5).
- AI die bestemmingen zonder bevestiging wegschrijft.
- Deelfacturen per onderdeel (bijvoorbeeld alleen de catering apart
  factureren); deel- en slotfactuur blijven op bedrag.
- Server-side paginering van het werkblad; een project heeft tientallen
  regels, geen duizenden.

## Bijvangst (los van dit plan te verhelpen)

Gevonden in de code tijdens het onderzoek, buiten de scope van het werkblad:

- `match-bank-lines` selecteert `customer_name` en `paid_at` op
  `bureau_invoices`; die kolommen bestaan niet. De verkoopkant van de
  bankmatching faalt vermoedelijk stil.
- `useBankStatements.ts:206` zet een betaalbatch op `status 'paid'`, maar de
  check-constraint kent alleen `generated` en `cancelled`; de fout wordt niet
  gecontroleerd.
- `dismiss-partner-invoice-item` schrijft naar niet-bestaande kolommen van
  `project_communications` en `admin_todos`; alleen de itemkolommen komen
  aan.
- `AdminFinancialDashboard` telt creditnota's (positief opgeslagen) op bij
  "gefactureerd" in plaats van ze af te trekken.
- `rescan-inbox-invoices` heeft geen aanroeper in de frontend.
- De oude unieke index `partner_purchase_invoices_partner_invoicenr_norm_idx`
  wordt in geen migratie verwijderd, maar zou de "extra project"-rijen met
  hetzelfde nummer blokkeren; waarschijnlijk buiten de migraties verwijderd.
  Nalopen in het Supabase-dashboard.
