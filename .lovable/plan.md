

# Bug fix: Status badge toont onterecht "Nog niet verstuurd"

## Probleem

In `AdminRequestDetail.tsx` regel 1141 staat:
```tsx
request?.invoicing_mode === "bureau_central" && item.status === "pending"
  ? "Nog niet verstuurd"
  : statusInfo.label
```

Dit toont "Nog niet verstuurd" voor **alle** pending items bij `bureau_central` facturering. Maar de items van Schenkelbouw hebben `skip_partner_notification = false` — ze zijn dus wél verstuurd naar de partners. Het label is misleidend.

De banner met "Verstuur naar partners" knop controleert wél correct op `skip_partner_notification === true`, waardoor die terecht niet verschijnt. Maar de status-badges per item kloppen niet.

## Oplossing

Eén regel aanpassen in `AdminRequestDetail.tsx`:

```tsx
request?.invoicing_mode === "bureau_central" && item.status === "pending" && item.skip_partner_notification
  ? "Nog niet verstuurd"
  : statusInfo.label
```

Dit zorgt dat:
- Items met `skip_partner_notification = true` → "Nog niet verstuurd" (correct, nog te versturen)
- Items met `skip_partner_notification = false` → "Aangevraagd" (correct, wacht op reactie partner)

## Bestand
- `src/pages/admin/AdminRequestDetail.tsx` — regel 1141

