

## Analyse: Bureau Vlieland als admin EN partner — verwarring in het systeem

### Huidige situatie

Bureau Vlieland bestaat als partner in de `partners` tabel met `id: "bureau"`. Daarnaast wordt in de code ook `"bureau-vlieland"` als hardcoded `provider_id` gebruikt. Dit levert drie problemen op:

### Probleem 1: Twee identiteiten voor dezelfde entiteit
- **`provider_id = "bureau"`** — bestaat als echte partner in de database, gebruikt door `isBureauItem()` checks
- **`provider_id = "bureau-vlieland"`** — hardcoded in 6 frontend-bestanden (AdminAddActivitySheet, AdminEditActivitySheet, AdminAddCostSheet, AdminAiProgramDialog, ApplyTemplateDialog, AccommodationWizard), maar bestaat NIET in de partners tabel

De `isBureauItem()` functie in `projectWorkflow.ts` checkt alleen op `provider_id === "bureau"`, waardoor items met `provider_id = "bureau-vlieland"` **niet** als bureau-items herkend worden. Hetzelfde geldt voor de edge functions (`send-items-to-partners`, `accept-quote-proposal`, `approve-quote-item`).

**In de database**: 34 items met `provider_id = "bureau"` + 19 items met `provider_id = "bureau-vlieland"`, allemaal met `block_type = "bureau"`.

### Probleem 2: `block_type = "bureau"` op partner-items
Door `invoicing_mode = "bureau_central"` wordt `block_type` geforceerd op `"bureau"` voor **alle** items, ook die van echte externe partners (zuiver: 22 items, vlieland-outdoor-center: 14, zeehonden: 10, etc.). Dit betekent dat `block_type === "bureau"` **niet** betrouwbaar aangeeft dat iets een intern bureau-item is — het geeft alleen aan dat Bureau Vlieland factureert.

De `isBureauItem()` functie geeft dus foutief `true` terug voor externe partner-items die toevallig `block_type = "bureau"` hebben.

### Probleem 3: Gevolgen
- **Tellingen kloppen niet**: items van echte partners (Zuiver, Vlieland Outdoor Center, etc.) worden als "bureau intern" geteld en niet meegenomen in "klaar voor partner" tellingen
- **Partnernotificaties**: de `send-items-to-partners` functie filtert items op `provider_id !== "bureau" && block_type !== "bureau"`, waardoor items van externe partners met `block_type = "bureau"` worden overgeslagen
- **Dashboard misleidend**: het aantal "bureau intern" items is veel hoger dan werkelijk, en "klaar voor partner" te laag

### Oplossing

**Kern**: het onderscheid "intern bureau-item" vs "extern partner-item" moet op `provider_id` gebaseerd zijn, niet op `block_type`. `block_type = "bureau"` betekent alleen "Bureau factureert" en zegt niets over wie het uitvoert.

**Stap 1 — Uniformeer de bureau provider_id**
- Kies één waarde: `"bureau"` (bestaat al als partner)
- Vervang alle hardcoded `"bureau-vlieland"` referenties door `"bureau"`
- Migreer bestaande data: `UPDATE program_request_items SET provider_id = 'bureau' WHERE provider_id = 'bureau-vlieland'`

**Stap 2 — Fix `isBureauItem()` logica**
- Verwijder de `block_type === "bureau"` check — die is onbetrouwbaar
- Baseer bureau-detectie alleen op `provider_id === "bureau"`

```typescript
export function isBureauItem(item: Pick<ItemForSendPhase, "provider_id">): boolean {
  return item.provider_id === "bureau";
}
```

**Stap 3 — Fix edge functions**
- `send-items-to-partners`: filter alleen op `provider_id !== "bureau"` (niet op `block_type`)
- `accept-quote-proposal`: idem
- `approve-quote-item`: idem

**Stap 4 — Admin UI duidelijkheid**
- In de admin detailpagina: toon "Bureau Vlieland (intern)" voor items met `provider_id = "bureau"`, en toon de partnernaam normaal voor externe partners — ook als `block_type = "bureau"` is

### Bestanden
1. `src/lib/projectWorkflow.ts` — fix `isBureauItem()`
2. `src/components/admin/AdminAddActivitySheet.tsx` — `"bureau-vlieland"` → `"bureau"`
3. `src/components/admin/AdminEditActivitySheet.tsx` — idem
4. `src/components/admin/AdminAddCostSheet.tsx` — idem
5. `src/components/admin/AdminAiProgramDialog.tsx` — idem
6. `src/components/admin/ApplyTemplateDialog.tsx` — idem
7. `src/components/accommodation/AccommodationWizard.tsx` — idem
8. `supabase/functions/send-items-to-partners/index.ts` — filter op provider_id only
9. `supabase/functions/accept-quote-proposal/index.ts` — idem
10. `supabase/functions/approve-quote-item/index.ts` — idem
11. `supabase/functions/update-customer-program/index.ts` — idem
12. Database migratie — `UPDATE provider_id = 'bureau' WHERE provider_id = 'bureau-vlieland'`

