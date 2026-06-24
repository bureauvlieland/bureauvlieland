# Fix self-service aanvragen: lege items & datum-shift

Twee bugs in de configurator submit-flow zorgden ervoor dat zelf-service aanvragen leeg binnenkwamen en de datum een dag eerder werd opgeslagen. Beide raken `CheckoutContactForm.tsx` (primair) en `RequestFormModal.tsx` (legacy modal).

## Bug 1 — Datum 1 dag eerder

`d.toISOString().split("T")[0]` converteert een lokale Date naar UTC. Klant in NL (UTC+1/+2) die 15 juli kiest → opgeslagen als `"2025-07-14"`.

**Locaties:**
- `src/components/configurator/CheckoutContactForm.tsx:247` (write naar `selected_dates`)
- `src/components/configurator/CheckoutContactForm.tsx:76` (dedup-hash)
- `src/components/configurator/RequestFormModal.tsx:134`

**Fix:** vervangen door `format(d, "yyyy-MM-dd")` uit `date-fns` (lokale tijd, geen UTC).

## Bug 2 — Lege aanvraag in admin

`blocksWithDetails` mapt cart items via `getBlockById(allBlocks, item.blockId)`. Als `usePublishedBuildingBlocks` nog niet is geresolved (`allBlocks = []`), worden alle `block?.id` leeg. De `program_request` insert (regel 252–268) commit dan al; de daarop volgende `program_request_items` insert (299) faalt op FK/UUID-validatie of schrijft lege rijen. Geen transactie → admin ziet kale request.

Zelfde patroon in `RequestFormModal.tsx:141–193`.

**Fix:**
1. **Guard vóór submit**: als `allBlocks.length === 0` of als één lookup faalt → submit blokkeren met duidelijke foutmelding ("Bouwstenen worden nog geladen, probeer het opnieuw") i.p.v. doorsturen.
2. **Pre-validate items**: bouw `blocksWithDetails` eerst; als één entry geen geldige `block.id` heeft → abort vóór de `program_request` insert.
3. **Volgorde omdraaien**: items-payload eerst opbouwen + valideren → dan pas `program_requests` insert → dan `program_request_items` insert. Bij falen van items: rollback via nieuwe edge function of via cleanup-delete van het zojuist aangemaakte request.
4. **Atomiciteit**: nieuwe edge function `submit-program-request` die beide inserts server-side in één RPC-call doet (Postgres function met BEGIN/COMMIT). Front-end roept alleen die functie aan. Voorkomt voor altijd weeskinderen.

## Unit tests (regressiebescherming)

Toevoegen in `src/components/configurator/__tests__/`:

1. `dateSerialization.test.ts` — `format(date, "yyyy-MM-dd")` met TZ stub op `Europe/Amsterdam` (zomer- én wintertijd) bewijst dat 15-07 → `"2025-07-15"` blijft, niet `"2025-07-14"`.
2. `checkoutSubmit.test.ts` — mockt `usePublishedBuildingBlocks` met (a) `[]`, (b) gedeeltelijke match, (c) volledige match. Assert:
   - (a) geen insert, gebruikersfout zichtbaar
   - (b) geen insert, fout zichtbaar
   - (c) beide inserts succesvol, items kloppen met cart
3. `submitAtomicity.test.ts` — forceert error op items-insert; assert dat `program_requests` ook gerollbacked is (na intro van edge function).
4. `draftRestore.test.ts` — Date → localStorage → restore → format roundtrip behoudt kalenderdatum.

Daarnaast: bestaande `dateUtils`/`itemStatus` testsuite uitbreiden met "nooit `toISOString().split('T')[0]` gebruiken voor selected_dates" — een grep-based lint-test (`scripts/lint-no-iso-date-slice.ts`) die in `bun test` faalt als het patroon ooit terugkeert in `src/components/configurator/**`.

## Bestanden

- bewerken: `src/components/configurator/CheckoutContactForm.tsx`
- bewerken: `src/components/configurator/RequestFormModal.tsx`
- nieuw: `supabase/functions/submit-program-request/index.ts` (atomic insert)
- nieuw: 4 testbestanden onder `src/components/configurator/__tests__/`
- nieuw: `scripts/lint-no-iso-date-slice.ts` + hookup in test script

## Buiten scope

Geen wijzigingen aan admin-weergave, status-logica of e-mailflow. Geen data-fix van bestaande lege requests (apart aan te vragen indien gewenst — ik kan dan ook de off-by-one datums in bestaande `program_requests.selected_dates` corrigeren).