## Probleem

Project **BV-2606-0028** staat op `quote_status = concept`. Alle items zijn `status = pending` zonder klant-akkoord. Toch toont zowel klantpagina als admin **"Wacht op aanbieder"**, terwijl de offerte nog niet verstuurd is en de aanbieder dus nog niet eens iets gevraagd is.

Volgens onze workflow (Quote → Klant-akkoord → Aanbieder benaderen) is de blokkade in `concept` en `in_afstemming` altijd het klant-akkoord — niet de aanbieder.

## Oorzaak

In `src/lib/itemStatus.ts` wordt `wacht_op_klant` alleen afgeleid wanneer `quoteStatus === "offerte_verstuurd"`. Voor `concept`/`in_afstemming` valt de logica terug op `wacht_op_partner` (omdat `item.status === "pending"`):

- **Klantview**: pre-offerte maskering geeft expliciet `wacht_op_partner`.
- **Adminview**: na het verwijderen van de maskering voor admin/partner valt admin terug op de generieke `pending → wacht_op_partner` regel.

Beide zijn workflow-technisch onjuist zolang de offerte nog niet verzonden is.

## Oplossing

In `src/lib/itemStatus.ts` de pre-offerte tak vervangen door één consistente regel:

> Zolang `quoteStatus ∈ {concept, in_afstemming, offerte_verstuurd}` én het item nog geen klant-akkoord heeft, is de status **`wacht_op_klant`** voor alle audiences.

Concreet:

1. Verwijder de bestaande `isPreOfferte && audience === "customer"` tak die `wacht_op_partner` forceert.
2. Breid de bestaande `offerte_verstuurd`-check uit naar ook `concept` en `in_afstemming`:
   ```ts
   const isPreApproval =
     ctx.quoteStatus === "concept" ||
     ctx.quoteStatus === "in_afstemming" ||
     ctx.quoteStatus === "offerte_verstuurd";
   if (isPreApproval && !hasApproval && item.status !== "alternative") {
     return "wacht_op_klant";
   }
   ```
3. `alternative` items behouden de bestaande tak (partner heeft tegenvoorstel gedaan — vereist klant-actie ongeacht fase).
4. Labels in `itemDisplayStatusConfig.wacht_op_klant` blijven ongewijzigd; voor de klant leest dit "Akkoord nodig" wat in concept/in_afstemming inhoudelijk klopt zodra het voorstel zichtbaar is.

## Tests

`src/lib/__tests__/itemStatus.test.ts` uitbreiden:
- concept + pending + geen approval → `wacht_op_klant` (admin én customer).
- in_afstemming + pending + geen approval → `wacht_op_klant`.
- Bestaande customer-view test die `wacht_op_partner` verwachtte in `in_afstemming` wordt aangepast naar `wacht_op_klant`.

## Scope

- Alleen `src/lib/itemStatus.ts` en de bijbehorende testfile.
- Geen UI- of edge-functie wijzigingen — alle views (admin detail, klantportaal, stepper, sidebar) consumeren dezelfde helper en updaten automatisch.
