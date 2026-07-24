## Plan — Vervolgfacturen alleen voor het restant + herstel BV-2605-0001

### 1. Herstel BV-2605-0001 (klant heeft FV-002 al ontvangen)

Omdat FV-BV-2605-0001-002 (€1.932,15) al bij de klant ligt: creditnota + aanvullende factuur, met begeleidende excuusmail.

- **Creditnota FV-BV-2605-0001-C002** — €1.932,15 credit, verwijst expliciet naar FV-002.
- **Nieuwe factuur FV-BV-2605-0001-003** — €407,40 incl. BTW (€1.932,15 grand total − €1.524,75 reeds gefactureerd via FV-001). Pro-rata BTW-uitsplitsing op basis van de bestaande VAT-groepen van het projecttotaal, zodat 9%/21% sluitend blijft.
- Beide records registreren via de bestaande `bureau_invoices`-tabel (invoice_type `credit` resp. `partial`).
- Ik zet géén automatische mail klaar. U beoordeelt zelf wanneer u de creditnota + nieuwe factuur met een korte excuustekst naar de klant stuurt via de bestaande "Verstuur naar klant"-knop op elk van de twee facturen.

### 2. Structurele fix — Factuur Maken laat vervolgfacturen alleen het restant registreren

In `src/pages/admin/AdminInvoicePreview.tsx`:

- `isSlotMode` afleiden uit "er bestaan al bureau_invoices voor dit project én de gebruiker maakt een nieuwe termijn aan" (op basis van `priorInvoices` en `searchParams.get("new") === "1"`), in plaats van de hardgecodeerde `false`.
- Bij `isSlotMode`: `effectiveTotalExclVat/Vat/InclVat` komen uit de bestaande `slotTotals`-berekening (pro-rata verdeling van `netDueIncl` over de VAT-groepen). Deze bedragen gaan naar zowel de registratie in `bureau_invoices` als naar `SendBureauInvoiceToCustomerDialog`.
- PDF-layout ongewijzigd: volledige projectspecificatie blijft zichtbaar met "Reeds gefactureerd −€…" en "Te betalen €…" onderaan (die totaal-regel gebruikt al `netDueIncl` bij `!isSlotMode` op regel 1536, dus daar is niets nodig).
- `canOfferSlotMode` weer inschakelen zodat de toggle "Slotfactuur openstaand / Termijn met regels" zichtbaar is als er prior invoices zijn. Default op slot-mode bij `?new=1`.

### 3. Extra vangnet — RegisterBureauInvoiceDialog krijgt volledige context

In `src/pages/admin/AdminRequestDetail.tsx` (regel 3343-3352): naast `suggestedAmount` ook `outstandingAmount`, `projectTotal` en `alreadyInvoiced` doorgeven. Het dialoog heeft al de "bedrag overschrijdt openstaand"-blokkade (regel 170-174), die nu aanslaat en handmatig registreren van een dubbel bedrag voorkomt.

### 4. Regressietest

Nieuwe test `src/lib/__tests__/followUpInvoiceRestOnly.test.ts`: gegeven een project met grand total €1.932,15 en één bestaande `partial` van €1.524,75, controleert dat een tweede `partial` alleen €407,40 registreert (excl./BTW/incl. pro-rata). Zo wordt deze klasse fouten voortaan door CI opgevangen.

### 5. Wijzigingen

| Bestand | Wijziging |
|---|---|
| Insert-query op `bureau_invoices` | Credit FV-BV-2605-0001-C002 (−€1.932,15) + nieuwe partial FV-BV-2605-0001-003 (€407,40); beide met verwijzing in `description` |
| `src/pages/admin/AdminInvoicePreview.tsx` | `isSlotMode`/`canOfferSlotMode` afleiden uit prior invoices + `new=1`; slot-mode als default bij nieuwe termijn |
| `src/pages/admin/AdminRequestDetail.tsx` | `outstandingAmount`, `projectTotal`, `alreadyInvoiced` doorgeven aan RegisterBureauInvoiceDialog |
| `src/lib/__tests__/followUpInvoiceRestOnly.test.ts` | Nieuwe testcase |

### Buiten scope

- E-mailen namens u: creditnota + nieuwe factuur stuurt u zelf via de bestaande verzendknop, met eigen excuustekst.
- Snelstart-doorsturen van FV-002: u besluit zelf of u die creditnota + nieuwe factuur ook naar Snelstart stuurt. Zolang FV-002 niet doorgestuurd is (screenshot: "Nog niet doorgestuurd") volstaat het om FV-002 niet meer door te sturen.
- Wijzigingen aan de PDF-layout: die is al correct.
