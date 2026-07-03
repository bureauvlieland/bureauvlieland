## Fix

In `src/lib/itemStatus.ts` de pre-offerte-fase gelijkschakelen aan `offerte_verstuurd`:

- Elk actief onderdeel zonder `customer_approved_at` → `wacht_op_klant` ("Goedkeuring nodig" bij klant, "Wacht op klant-goedkeuring" bij admin, "Voorstel verstuurd" bij partner) — ongeacht of `quoteStatus` `concept`, `in_afstemming` of `offerte_verstuurd` is.
- Alleen `status === "alternative"` (partner heeft na klant-akkoord een nieuw voorstel gedaan) blijft de bestaande "prijs/tijd opnieuw akkoord"-flow volgen.
- Terminale statussen (`cancelled`, `executed`, `invoiced`, `unavailable`, `self_arranged`) en al-goedgekeurde items (`klant_akkoord_*`, `geaccepteerd`, `prijs_gewijzigd`) blijven ongewijzigd.

Concreet vervangt dit het huidige `isPreparationPhase`-blok door één regel: "geen klant-akkoord ⇒ `wacht_op_klant`". De aparte `offerte_verstuurd`-tak wordt daarmee overbodig.

## Impact

- Admin, klantportaal, partnerportaal en werkbank tonen tijdens Concept overal "Goedkeuring nodig" / "Wacht op klant-goedkeuring" — consistent met de klantwerkelijkheid.
- Zodra de klant een onderdeel goedkeurt, gaat het door naar `klant_akkoord_wacht_partner` / `klant_akkoord_bureau` (bestaand gedrag).
- Geen wijziging in edge functions, e-mails of workflow — puur UI-afleiding.
- Ik controleer `src/lib/__tests__/itemStatus.test.ts` en pas eventueel scenario's aan die op de oude concept-afleiding leunden.
