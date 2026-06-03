## Doel

Op rode (`unmatched`) regels in de Doeksen-verzamelfactuur-sheet een derde actie toevoegen waarmee de admin de regel direct als **losse kostenpost** (Overige kosten / bureau-item) op een bestaand project boekt — vergelijkbaar met de "Overnemen"-flow van partner-nacalculatie.

## Waar

`src/components/admin/purchase-invoices/CollectiveInvoiceSheet.tsx`, in het `unmatched`-blok (regels 410–425), naast "Koppel handmatig…" en "Markeer als intern".

## Nieuwe actie: "Boek als extra kosten op project…"

1. Opent een popover met een projectzoeker (referentie / klantnaam / bedrijf), filterend op `program_requests` met status ≠ `cancelled/deleted`.
2. Na keuze maakt het een nieuwe `program_request_items` rij aan:
   - `request_id` = gekozen project
   - `block_type` = `bureau`
   - `provider_id` = `rederij`
   - `day_index` = `-1` (interne/pinned bureau-laag)
   - `block_name` = bv. `"Doeksen — extra (Resnr {resnr})"`
   - `booking_reference` = de Resnr van de regel
   - `quoted_price` = bedrag (incl. BTW) van de regel
   - `skip_partner_notification` = `true`
3. Vervolgens behandelt de sheet de booking-regel als een normale `matched`-koppeling: `match_status: "matched"`, `item_id` = nieuwe item-id, `project` = gekozen project — zodat de verzamelfactuur de kosten op dat project alloceert (zelfde pad als bestaande matches).

## UX-details

- Knop-label: **"Boek als losse kosten op project…"** (ghost button, zelfde stijl als "Koppel handmatig…").
- Bevestigingstoast: *"Kostenpost toegevoegd aan {referentie} — {klant}"*.
- Na aanmaken: rode rand wordt groen, Resnr-badge verdwijnt, project-link verschijnt zoals bij andere matched-regels.
- Geen wijziging aan "Markeer als intern" of "Koppel handmatig…".

## Technisch

- Hergebruik het bestaande `ManualLinkPopover`-zoekpatroon, maar zonder filter op `provider_id = rederij` voor het zoeken naar projecten (we zoeken `program_requests` ipv items). Eenvoudigste: nieuwe kleine `ProjectPickerPopover` die `program_requests` zoekt.
- Itemcreatie via `supabase.from('program_request_items').insert(...)` met service-role niet nodig (admin RLS dekt dit al).
- Geen migraties nodig; `program_request_items` ondersteunt `block_type='bureau'`, `day_index=-1`, en `booking_reference` al (zoals gebruikt in bestaande Doeksen- en partner-nacalculatie-flows).

## Niet in scope

- Geen wijziging aan partner-nacalculatie of admin-projectaanmaak (eerdere vraag blijft openstaan).
- Geen nieuwe statussen of triggers.
