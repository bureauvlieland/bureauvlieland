

# Status-label corrigeren voor maatwerk-programma's

## Probleem
Bij maatwerk-programma's (program_type = "quote") toont het klantportaal de status "Aangevraagd" bij alle pending items. Dit is misleidend omdat partners pas worden aangeschreven nadat de klant akkoord geeft op het programma. Vóór dat moment zijn de items "in voorbereiding", niet "aangevraagd".

De huidige "In voorbereiding" override werkt alleen voor `invoicing_mode === "bureau_central"`, maar zou moeten gelden voor alle maatwerk-programma's zolang de klant nog geen akkoord heeft gegeven.

## Oplossing
De override-logica uitbreiden zodat **alle** maatwerk-programma's met een quote_status vóór `akkoord_ontvangen` het label "In voorbereiding" tonen in plaats van "Aangevraagd".

## Wat verandert

### Logica-aanpassing
Het label "In voorbereiding" wordt getoond wanneer:
- `program_type === "quote"` EN
- `quote_status` is `concept`, `in_afstemming`, of `offerte_verstuurd` EN
- De item-status is `pending`

Na klantakkoord (`akkoord_ontvangen` / `definitief_bevestigd`) schakelt het label over naar "Aangevraagd" omdat de partners dan daadwerkelijk worden benaderd.

### Technische aanpassing
De `invoicingMode`-prop die nu door DesktopProgramView en MobileProgramView aan CustomerProgramItem wordt doorgegeven, moet worden aangevuld met `quoteStatus` en `programType` (of een gecombineerde boolean `isPreApproval`). 

Er zijn drie bestanden die worden aangepast:

1. **`src/components/customer-portal/CustomerProgramItem.tsx`**
   - Nieuwe prop: `isPreApproval?: boolean`
   - Override-conditie wijzigen van `invoicingMode === "bureau_central"` naar `isPreApproval || invoicingMode === "bureau_central"`

2. **`src/components/customer-portal/DesktopProgramView.tsx`**
   - Berekenen van `isPreApproval` op basis van `program_type === "quote"` en `quote_status` niet `akkoord_ontvangen` of `definitief_bevestigd`
   - Doorgeven van `isPreApproval` aan elke CustomerProgramItem

3. **`src/components/customer-portal/MobileProgramView.tsx`**
   - Zelfde aanpassing als DesktopProgramView

### Resultaat
- **Voor akkoord**: Items tonen "In voorbereiding" (geel/amber badge)
- **Na akkoord**: Items tonen "Aangevraagd" (de gebruikelijke pending-badge)
- **Self-arranged items**: Blijven altijd "Zelf te regelen" tonen (ongewijzigd)

