# Plan — Foutloze prijsweergave & partnerflow voor bureau-items

Onderzoek per probleem (project BV-2603-0003, Milou van der Zwaan, 33 personen).

---

## Probleem 1 — "Verstuur naar 0 partner(s)" kan niet geklikt worden

**Bevinding**
- Twee nieuwe onderdelen ("Overtocht Harlingen → Vlieland" en "Overtocht Vlieland → Harlingen") zijn `provider_id = 'bureau'`, `block_type = 'bureau'`, `skip_partner_notification = true`, `status = 'pending'`.
- De edge function `send-items-to-partners` herkent deze als bureau-items en zou ze in dry-run tonen onder *"Bureau Vlieland items (geen e-mail, wel vrijgegeven)"* — wat ook gebeurt op het screenshot.
- In `AdminRequestDetail.tsx` (regel 2344) staat echter:
  ```ts
  disabled={isSendingToPartners || !sendPreview?.partners.length}
  ```
  → de knop is gedisabled zodra er **geen externe partners** in de preview zitten, óók als er wel bureau-items vrijgegeven moeten worden.
- Hierdoor blijven de items op `skip_partner_notification = true` staan en verschijnen ze nergens (niet in partneromgeving Bureau Vlieland — die filtert op `skip_partner_notification = false`).

**Fix**
1. `AdminRequestDetail.tsx`: knop ook activeren wanneer `sendPreview.bureauItemsList.length > 0`.
2. Knoplabel dynamisch: `Verstuur naar X partner(s)` óf `Geef Y bureau-onderdeel(en) vrij` óf gecombineerd.
3. Toast-bericht na success aanpassen wanneer alleen bureau-items zijn vrijgegeven (de edge function geeft hier al een correct `message` voor).

---

## Probleem 2 — Prijswijzigingen na klantakkoord komen niet door op klant- en partnerportaal

**Bevinding**
- Wanneer admin een prijs wijzigt via `handleItemPriceUpdate` (regel 917) wordt alleen `admin_price_override` / `price_type` geüpdatet. Geen audit, geen partnersync, geen klant-flag.
- Voor reeds geaccordeerde items (`customer_approved_at IS NOT NULL` en/of `quoted_price` ingevuld) heeft `admin_price_override` nu **geen invloed** op de berekende totaalprijs in `PriceSummaryCard` — `quoted_price` wint altijd (regel 121-123). Dat verklaart waarom de klant geen prijswijziging ziet.
- De partner zou moeten kunnen reageren op een nieuwe admin-prijs, maar `PartnerItemSheet` toont vooral `quoted_price` zodra die ingevuld is. Geen notificatie of UI-cue dat admin de prijs heeft aangepast.

**Fix — admin acteert als bron van waarheid voor prijs**

A. **Datamodel + state**
   - Nieuwe kolom `admin_price_override_updated_at timestamptz` op `program_request_items` (al bestaande velden gebruiken voor logging).
   - Nieuwe kolom `partner_price_change_acknowledged_at timestamptz` zodat we kunnen tonen "wijziging open / bevestigd door partner".
   - Bij `handleItemPriceUpdate`:
     - zet `admin_price_override_updated_at = now()`.
     - reset `partner_price_change_acknowledged_at = null`.
     - log een history-entry (`admin_changed_price`) met oude/nieuwe waarde + notes.
     - **Wanneer er al een `quoted_price` bestaat én de override afwijkt**: laat admin via een bevestigingsdialoog kiezen tussen
       (a) *Stel de nieuwe prijs voor aan de partner* — `quoted_price` wordt **niet** direct overschreven, partner krijgt UI-cue + e-mail om opnieuw te bevestigen.
       (b) *Forceer nieuwe prijs als definitieve partnerprijs* — overschrijft `quoted_price` direct (alleen als bureau-item of admin expliciet bevestigt), reset `customer_approved_at` zodat klant opnieuw moet akkoorderen.
   - Beide paden: indien item al `customer_approved_at` had → reset deze naar `null` + zet `item_quote_status = 'in_afstemming'`. Daarmee verschijnt het opnieuw als "actie vereist" voor klant.

B. **Partnerportaal**
   - In `PartnerItemSheet` / `PartnerItemCard`: als `admin_price_override_updated_at > quoted_at` (of `quoted_at IS NULL`), toon banner *"Bureau Vlieland heeft een nieuwe prijs voorgesteld: € X. Bevestig of pas aan."* met dezelfde knoppen als bij eerste prijsopgave.
   - Bij partnerbevestiging: zet `quoted_price` op nieuwe waarde, `partner_price_change_acknowledged_at = now()`, en `customer_approved_at = null` op klantzijde (al gereset in stap A).

C. **Klantportaal**
   - `PriceSummaryCard` blijft `quoted_price` gebruiken als die er is (bron van waarheid voor partner). Bij reset (`customer_approved_at = null`) verschijnt onderdeel weer in *"Actie vereist"* lijst en wordt opnieuw doorberekend.
   - Indicator op item: *"Prijs is aangepast — controleer en geef opnieuw akkoord"* wanneer `admin_price_override_updated_at` na `customer_approved_at` ligt.

D. **Notificatie-mail naar partner**
   - Nieuwe edge function `notify-partner-price-change` (Mailjet, via bestaande `_shared/email-templates.ts`) — verzonden vanuit het bevestigingspad in handleItemPriceUpdate (alleen voor externe partners, nooit `provider_id='bureau'`).
   - Onderdrukken in test-mode-reroute conform Fase 4 logica.

---

## Probleem 3 — Trattoria Oliva: €48,95 (klant) vs €44,50 (admin & partner)

**Bevinding (data)**
| veld | waarde |
|---|---|
| `quoted_price` | 1468.50 (groepstotaal) |
| `admin_price_override` | 44.50 (per persoon) |
| `override_people` | 30 |
| `price_type` | `per_person` |
| `number_of_people` (request) | 33 |

**Berekening klantportaal** (`PriceSummaryCard` regel 121-123):
- `effectivePrice = quoted_price = €1468,50` ✔
- `unitPrice = 1468,50 / 30 = €48,95 p.p.` → toont *"€48,95 p.p. × 30 = €1.468,50"*

**Berekening admin** (`AdminQuotePriceEditor` displayPrice = `quoted_price`, displayLabel = "totaal"): toont *"€1.468,50 totaal"* + struck-through *"€44,50 p.p."*. Het `€44,50 p.p.` op het screenshot is de **doorgehaalde oude schatting**, niet de werkelijke prijs.

**Berekening partner** (`PartnerItemCard` regel 165-176, `PartnerItemSheet` regel 444-451): gebruikt `request.number_of_people` (= 33) i.p.v. `override_people` (= 30). Bij `quoted_price` wordt `1468,50` getoond, maar de "Verwachte prijs"-regel daarboven berekent `44,50 × 33 = €1.468,50` — toevallig hetzelfde bedrag (44,50 × 33 = 1468,50). Dat is niet toevallig — admin heeft de override exact zo gezet dat 44,50 × 33 = 1468,50, terwijl klant ziet 48,95 × 30.

**Grondoorzaak**
- `override_people` wordt **niet** gerespecteerd in partnerportaal (alleen `request.number_of_people`).
- `unitPrice` afgeleid uit `quoted_price` deelt door `override_people` op klantzijde, maar admin/partner tonen de raw `admin_price_override`. Dit zijn drie verschillende formules.

**Fix**
1. **Eén centrale pricing-helper** uitbreiden in `src/lib/portalPricing.ts`:
   - `getDisplayUnitPrice(item, programPeople)` — uniform: deelt `quoted_price` door `effectivePeople = override_people ?? programPeople`. Voor `admin_price_override` zonder `quoted_price` gebruikt direct override.
   - `getDisplayPeopleCount(item, programPeople)` — `override_people ?? programPeople`.
2. **Partnerportaal** (`PartnerItemCard`, `PartnerItemSheet`, `InvoiceRegistrationDialog`): vervang `request.number_of_people` door `getDisplayPeopleCount(item, request.number_of_people)`.
3. **Admin** (`AdminQuotePriceEditor`, `AdminRequestDetail` regels 1846-1859, `FinancialOverviewCard`): zelfde helper gebruiken, zodat label en bedrag één bron van waarheid hebben.
4. Visuele consistentie: overal "€X,XX p.p. × N = €Y,YY totaal" — nooit alleen p.p. zonder context.

---

## Probleem 4 — Generieke garantie: drie pagina's tonen identieke totalen

**Aanpak**
- **Snapshot test**: kleine TS-helper `assertItemTotalsConsistent(item, programPeople, days)` die in dev-mode in console waarschuwt als admin/partner/klant-totalen voor één item afwijken.
- **Documentatie**: bij `portalPricing.ts` korte commentaarsectie met "single source of truth" regels (al deels aanwezig — uitbreiden met `override_people` en quoted_price-derivatie).
- **Memory** updaten: regel "Item-prijs op 3 portalen MOET via `getItemLineTotal` + `getDisplayUnitPrice` uit `portalPricing.ts`. Partner gebruikt `override_people ?? number_of_people`."

---

## Implementatievolgorde

1. **Database migratie**: kolommen `admin_price_override_updated_at`, `partner_price_change_acknowledged_at`.
2. **Centrale pricing-helper** uitbreiden en alle drie de portalen erop laten leunen (Probleem 3).
3. **Send-button fix** voor bureau-items (Probleem 1).
4. **Prijswijziging-flow** met dialoog, history, partnernotificatie en klant-reset (Probleem 2 + nieuwe edge function).
5. **UI-cues** in partner- en klantportaal voor "prijs aangepast — actie vereist".
6. **QA** op project BV-2603-0003: bureau-items vrijgeven → zichtbaar in partneromgeving Bureau Vlieland; Trattoria Oliva-bedrag identiek op alle drie portalen; admin prijswijziging triggert correct partner- en klantflow.

## Niet in scope
- Wijzigen van `coordinationFee`/BTW-logica (werkt al consistent).
- Logies-prijsflow (al aparte issue gehandeld).
