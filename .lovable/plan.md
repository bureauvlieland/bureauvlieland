
## Diagnose

**Partner-factuur (Watertaxi De Bazuin):**
- 0% over €0,00 → €0,00
- 9% over €871,56 → €78,44
- 21% over €231,40 → €48,60
- Totaal excl: €1.102,96 / BTW: €127,04 / Incl: €1.230,00

**Wat de AI-scan invulde:**
- Excl: €1.102,96 (juist totaal)
- BTW%: 21% → BTW €231,62 → Incl €1.334,58 (fout)

De scanner heeft het correcte excl-totaal gepakt maar **alleen één BTW-tarief gekozen** (21%) en daar het hele excl-bedrag mee belast. De factuur heeft een gemengd BTW-tarief (9% + 21% + 0%) — dat past niet in de huidige `RegisterInkoopfactuurDialog` die maar één regel met één BTW% ondersteunt.

## Plan

### 1. Multi-BTW orderregels in `RegisterInkoopfactuurDialog`
Vervang de enkele BTW-rij door een array van regels (zoals het ontwerp al hint: "Regel toevoegen" knop staat er al, maar voegt nog niets toe).
- Per regel: omschrijving (optioneel), excl. BTW, BTW%, BTW-bedrag (auto), incl. BTW (auto)
- Onder de regels: BTW-breakdown per tarief + grand total
- Bij opslaan: regels schrijven naar `purchase_invoice_lines` (tabel bestaat al), en op `purchase_invoices`-hoofdrecord aggregaten (`amount_excl_vat`, `vat_amount`, `amount_incl_vat`) opslaan als som per tarief (BTW per groep berekenen, niet per regel — voorkomt cent-afwijkingen).

### 2. AI-scanner uitbreiden naar multi-BTW
In `scan-purchase-invoice` / `scan-purchase-invoice-internal`: tool-schema `extract_invoice` aanpassen zodat `vat_breakdown` (array van `{vat_rate, amount_excl, vat_amount}`) verplicht is wanneer de factuur meerdere tarieven heeft. Prompt expliciet maken: "Als de factuur een BTW-overzicht/grondslag-tabel toont met meerdere tarieven, vul dan `vat_breakdown` met één entry per tarief — vul `vat_rate` op hoofdniveau dan NIET in."
- `line_items` blijft optioneel; bij watertaxi-achtige facturen vaak leeg of niet één-op-één matchend.

### 3. Pre-fill logica in dialoog
- Als `scan_result.vat_breakdown.length > 1` → maak één orderregel per BTW-tarief met excl-bedrag uit breakdown.
- Als `vat_breakdown` leeg of 1 entry → één regel zoals nu.
- Als `line_items` aanwezig én elke regel heeft `vat_rate` → gebruik die in plaats van breakdown (fijnmaziger).

### 4. Opslag
`purchase_invoice_lines` heeft al kolommen voor description/quantity/unit_price/vat_rate/amounts (analoog aan `program_item_billing_lines`). Geen migratie nodig — alleen verifiëren dat alle benodigde kolommen er zijn (check tijdens implementatie).

### Bestanden
- `src/components/admin/RegisterInkoopfactuurDialog.tsx` — multi-line orderregels + breakdown
- `src/hooks/usePurchaseInvoices.ts` — opslag van `purchase_invoice_lines` bij create
- `supabase/functions/scan-purchase-invoice/index.ts` + `scan-purchase-invoice-internal/index.ts` — `vat_breakdown` verplicht bij multi-rate, prompt aanscherpen
- `src/types/purchaseInvoiceInbox.ts` — type al up-to-date, evt. minor tweaks

### Buiten scope
- UI om bestaande (al opgeslagen) inkoopfactuur achteraf in regels te splitsen — handmatig corrigeren in dialoog volstaat.
- Doorzetten van inkoopfactuur-regels naar Snelstart-export — separate stap.

### Vraag
Voor déze concrete factuur: zal ik de AI opnieuw laten scannen met het verbeterde prompt, of pas je hem na de fix handmatig aan in de dialoog?
