

## Plan: Bureau Vlieland items laten werken via het partnerportaal

### Het probleem

Bureau Vlieland heeft een partner-record (`id: "bureau"`), maar bureau-items worden op drie plekken structureel geblokkeerd:

1. **`send-items-to-partners`** — filtert `provider_id === "bureau"` eruit, dus bureau-items worden nooit "vrijgegeven" (`skip_partner_notification` blijft `true`)
2. **`get-partner-dashboard`** — filtert op `skip_partner_notification = false`, dus bureau-items verschijnen nooit in het partnerportaal
3. **`projectWorkflow.ts`** — labelt bureau-items als `bureau_intern`, waardoor ze in admin-overzichten als "niet relevant" worden behandeld

Resultaat: bootkaarten, fietshuur, 4x4 inzet etc. zitten permanent op `pending` + `skip_partner_notification: true`. Niemand kan ze bevestigen, uitvoeren of factureren.

### De oplossing: Bureau Vlieland behandelen als gewone partner

Bureau-items moeten dezelfde workflow doorlopen als alle andere partner-items. De enige uitzondering: er hoeft geen e-mail naar Bureau Vlieland gestuurd te worden (je bent het zelf).

### Wijzigingen

**1. `supabase/functions/send-items-to-partners/index.ts`**

Bureau-items meenemen in de "versturen" flow, maar zonder e-mail:
- Verwijder de filter `provider_id !== "bureau"` uit de partnerItems groep
- Bij het versturen: als `partnerId === "bureau"`, sla de e-mail over maar update wel `skip_partner_notification: false` en `status: "pending"`
- Bureau-items verschijnen dan in het partnerportaal en kunnen bevestigd/uitgevoerd worden

**2. `src/lib/projectWorkflow.ts`**

- Verwijder de `isBureauItem` uitzondering uit `getItemSendPhase()` — bureau-items volgen dezelfde fase-logica als partner-items
- Behoud de `isBureauItem()` helper voor eventueel ander gebruik, maar markeer als deprecated

**3. `src/lib/quoteItemSendStatus.ts`**

- Geen wijziging nodig — deze filtert niet op provider_id

**4. `src/components/admin/WorkOverview.tsx`**

- Verwijder de filter `provider_id !== "bureau"` uit de items-analyse, zodat bureau-items meetellen als "wachtend" of "te bevestigen"

**5. `src/pages/admin/AdminRequestDetail.tsx`**

- Verwijder de "Bureau intern" fase-label en behandel bureau-items als gewone items in het statusoverzicht

### Wat er niet verandert

- Het partnerportaal zelf hoeft niet aangepast — Bureau Vlieland logt al in als partner en het dashboard toont automatisch items zodra `skip_partner_notification = false`
- De `get-partner-dashboard` edge function hoeft niet aangepast — die filtert correct op `provider_id = partner.id` en `skip_partner_notification = false`
- Facturatie, commissie en statusupdates werken al via het partnerportaal

### Migratie: bestaande bureau-items vrijgeven

Database migratie om alle bestaande bureau-items die op `skip_partner_notification: true` staan vrij te geven:

```sql
UPDATE program_request_items
SET skip_partner_notification = false
WHERE provider_id = 'bureau'
  AND skip_partner_notification = true
  AND status != 'cancelled';
```

### Resultaat

- Na "Verstuur naar partners" worden bureau-items automatisch mee-vrijgegeven (zonder e-mail)
- Bureau Vlieland ziet bootkaarten, fietshuur, 4x4 etc. in het eigen partnerportaal
- Items kunnen bevestigd, uitgevoerd en gefactureerd worden via dezelfde workflow als externe partners
- Admin-overzichten tonen bureau-items als reguliere werkitems

### Bestanden
1. `supabase/functions/send-items-to-partners/index.ts` — bureau-items meenemen, e-mail overslaan
2. `src/lib/projectWorkflow.ts` — bureau_intern fase verwijderen
3. `src/components/admin/WorkOverview.tsx` — bureau-filter verwijderen
4. `src/pages/admin/AdminRequestDetail.tsx` — "Bureau intern" label verwijderen
5. Database migratie — bestaande bureau-items vrijgeven

