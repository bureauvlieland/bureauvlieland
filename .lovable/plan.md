

## Plan: Facturatiemodel standaard op "bureau" zetten

### Probleem

Het project gebruikt `invoicing_mode = "bureau_central"`, maar bij het toevoegen van activiteiten wordt `block_type` standaard bepaald door het building block zelf (meestal `"partner"`). Dit gebeurt op drie plekken:

1. **AdminAddActivitySheet** — `invoicedBy` default is `"partner"` (regel 82), en bij blockselectie wordt `block.block_type` overgenomen (regel 121)
2. **AdminAiProgramDialog** — gebruikt `block.block_type` direct bij insert (regel 154)
3. **ApplyTemplateDialog** — gebruikt `block.block_type` direct bij insert (regel 67)

### Aanpassingen

**1. `AdminAddActivitySheet.tsx`**
- Prop `invoicingMode?: string` toevoegen
- Default van `invoicedBy` state wijzigen: als `invoicingMode === "bureau_central"` → default `"bureau"`
- Bij blockselectie (regel 121): als `invoicingMode === "bureau_central"` → altijd `"bureau"` zetten
- Optioneel: de hele "Gefactureerd door" radio verbergen als `bureau_central` actief is (want er is geen keuze)

**2. `AdminRequestDetail.tsx`**
- De prop `invoicingMode={request?.invoicing_mode}` meegeven aan `AdminAddActivitySheet`

**3. `AdminAiProgramDialog.tsx`**
- Prop `invoicingMode?: string` toevoegen
- Bij insert: als `invoicingMode === "bureau_central"` → `block_type: "bureau"` forceren

**4. `ApplyTemplateDialog.tsx`**
- Prop `invoicingMode?: string` toevoegen
- Bij insert: als `invoicingMode === "bureau_central"` → `block_type: "bureau"` forceren

**5. Bestaande data repareren**
- Database migratie: alle `program_request_items` waar het gekoppelde `program_requests.invoicing_mode = 'bureau_central'` maar `block_type != 'bureau'` → update naar `block_type = 'bureau'`

### Technische details

SQL migratie voor bestaande data:
```sql
UPDATE program_request_items pri
SET block_type = 'bureau'
FROM program_requests pr
WHERE pri.request_id = pr.id
  AND pr.invoicing_mode = 'bureau_central'
  AND pri.block_type != 'bureau';
```

