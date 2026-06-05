## Doel

1. De knop **Verzamelfactuur** wordt op élke nieuwe inkoopfactuur in de inbox getoond, naast **Verwerken**.
2. Bij herkende verzamelleveranciers (Doeksen/rederij, Isla Vlieland) is **Verzamelfactuur** de primaire (oranje) knop, anders is **Verwerken** primair.
3. De verzamelfactuur-flow ondersteunt naast Doeksen ook **Isla Vlieland B.V.** (bagagevervoer), met regel-matching op klantnaam (Isla heeft geen Resnr).

## UI-wijziging (`AdminPurchaseInvoiceInbox.tsx`)

- Knop **Verzamelfactuur** altijd zichtbaar bij `status === "new"`.
- `isLikelyCollective()` bepaalt welke knop primair is (oranje) — anders outline-stijl.
- `guessPartnerId()` uitbreiden: `/isla/` → `"isla-vlieland"` (concept-partner-id), `/doeksen|rederij/` → `"rederij"`, anders `null` (gebruiker kan in sheet alsnog leverancier kiezen of het wordt gepromptd).
- Als `partnerId` niet bekend is wordt 'rederij' niet meer hard fallback; in plaats daarvan opent de sheet met de gescande supplier-naam en laat de matching het werk doen.

## Edge-function `parse-collective-invoice`

- Huidige parser is Doeksen-specifiek (Resnr/routes/touristtax). We voegen een **supplier-detectie** toe op basis van de gescande PDF-tekst:
  - `doeksen` → bestaand Doeksen-schema (ongewijzigd).
  - `isla` → nieuw Isla-schema: per regel `customer_name`, `delivery_date`, `description`, `amount_excl_vat`, `vat`, `amount_incl_vat`. Geen `resnr`, geen `tourist_tax`, geen `supplier_commission`.
- Response houdt dezelfde `Booking[]`-structuur aan; voor Isla blijven `resnr`, `routes`, `tourist_tax`, `supplier_commission` leeg/0 zodat de bestaande UI gewoon rendert.
- Matching server-side: voor Isla matchen we per regel op **klantnaam (fuzzy, case-insensitive, levenshtein/normalisatie)** tegen `program_requests.customer_name` (alle niet-geannuleerde projecten in een venster van ±90 dagen rond de factuurdatum). Resultaat per regel:
  - 1 hit → `matched` + project gekoppeld.
  - >1 hit → `ambiguous` met candidates.
  - 0 hit → `unmatched` (admin koppelt handmatig via bestaande picker).

## Edge-function `finalize-collective-invoice`

- Voor Isla-regels: kost wordt als **extra kost** op het gekoppelde project geboekt (zelfde mechanisme als nu voor unmatched Doeksen-regels), met `provider_name = "Isla Vlieland B.V."` en `booking_reference = factuurnummer + index`. Geen automatische koppeling aan een specifiek `program_request_item` (Isla heeft geen booking-reference op item-niveau).
- Snelstart-forward blijft hetzelfde.

## CollectiveInvoiceSheet (UI)

- Toont bij Isla geen kolommen voor Resnr/routes/tourist tax (conditional rendering op `partnerId !== "rederij"` of op aanwezigheid van die velden).
- Sheettitel + beschrijving worden gegenereerd op basis van `data.invoice.supplier_name`.

## Geen wijziging

- Doeksen-flow blijft 1-op-1 werken.
- Bestaande inkoopfactuur-records, koppelingen en Snelstart-integratie ongewijzigd.

## Technische details

- Geen DB-migratie nodig: we hergebruiken `purchase_invoices` + `purchase_invoice_lines` (of huidige tabellen) en koppelen Isla-regels via de bestaande extra-kosten-route.
- Edge-functions deployen na codewijzigingen.
- Memory bijwerken: bestaande memo `doeksen-collective-invoice-flow` uitbreiden of nieuwe memo toevoegen voor "Isla collective invoice matching op klantnaam".
