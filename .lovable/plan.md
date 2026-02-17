

# Plan: Admin-gestuurde partner-notificaties bij maatwerk-programma's

## Overzicht

Dit plan combineert het eerder goedgekeurde plan (accept-quote-proposal aanroepen bij admin-akkoord) met een uitbreiding: de mogelijkheid om na het initiële akkoord nog items toe te voegen en die **apart** naar partners te versturen wanneer de admin klaar is.

## Huidige situatie

- Nieuwe items worden altijd toegevoegd met `skip_partner_notification: true` -- partners worden dus niet direct op de hoogte gebracht
- Er is geen manier om na het initiële akkoord alsnog notificaties te versturen voor later toegevoegde items
- De quote-status dropdown doet alleen een database-update, zonder de accept-flow te triggeren

## Wijzigingen

### 1. accept-quote-proposal edge function -- admin-modus

Uitbreiden zodat de functie ook door de admin kan worden aangeroepen:
- Accepteer optionele `request_id` en `admin_override` parameters
- Bij admin-override: programma ophalen via `request_id`, quote_status-check overslaan
- Actor in history-log instellen op "admin"
- Herbruikbaar voor zowel het initiële akkoord als het later versturen van nieuwe items

### 2. AdminRequestDetail.tsx -- quote-status naar akkoord

Bij het wijzigen van de quote-status naar `akkoord_ontvangen`:
- Roep de `accept-quote-proposal` edge function aan (met `admin_override` en `request_id`)
- Dit verstuurt automatisch alle items met `skip_partner_notification: true` naar partners

### 3. AdminRequestDetail.tsx -- "Verstuur naar partners" knop

Na het akkoord kunnen er nieuwe items worden toegevoegd. Daarvoor:
- Toon een banner/knop wanneer er items zijn met `skip_partner_notification: true` en de quote_status al `akkoord_ontvangen` is
- Tekst: "Er zijn X nieuwe onderdelen die nog niet naar partners zijn verstuurd"
- Knop: "Verstuur naar partners" -- roept dezelfde edge function aan
- Na het versturen verdwijnt de banner

### 4. Klantportaal communicatie (eerder goedgekeurd plan)

De eerder goedgekeurde wijzigingen voor de klantpagina blijven ongewijzigd:
- ActionRequiredCard: "Uw programma wordt voorbereid" bij concept/in_afstemming
- ProgramIntroCard: Bureau Vlieland-tekst bij pre-approval
- StatusSummary: "In voorbereiding" bij pre-approval statussen

## Technische details

### Edge function wijzigingen (accept-quote-proposal/index.ts)

Schema uitbreiden:
```typescript
const AcceptQuoteSchema = z.object({
  token: z.string().optional(),
  request_id: z.string().optional(),
  admin_override: z.boolean().optional(),
  origin: z.string().optional(),
}).refine(d => d.token || d.request_id, {
  message: "token of request_id is verplicht"
});
```

Programma ophalen:
- Bij `admin_override + request_id`: ophalen via `.eq("id", request_id)` in plaats van via token
- Quote_status validatie overslaan bij admin_override
- Bij admin_override: quote_status NIET wijzigen als die al `akkoord_ontvangen` is (zodat herhaald aanroepen voor nieuwe items werkt)

### AdminRequestDetail.tsx wijzigingen

1. `handleQuoteStatusChange`: bij `akkoord_ontvangen` de edge function aanroepen via `supabase.functions.invoke()`
2. Nieuwe state: `pendingPartnerItems` -- items met `skip_partner_notification: true`
3. Banner component met "Verstuur naar partners" knop (alleen zichtbaar wanneer `quote_status === "akkoord_ontvangen"` en er onverstuurde items zijn)
4. Handler `handleSendToPartners` die dezelfde edge function aanroept

### Bestanden die worden gewijzigd

- `supabase/functions/accept-quote-proposal/index.ts` -- admin-modus toevoegen
- `src/pages/admin/AdminRequestDetail.tsx` -- quote-status handler + verstuur-banner
- `src/components/customer-portal/ActionRequiredCard.tsx` -- pre-approval states (reeds goedgekeurd)
- `src/components/customer-portal/ProgramIntroCard.tsx` -- pre-approval tekst (reeds goedgekeurd)
- `src/components/customer-portal/StatusSummary.tsx` -- isPreApproval prop (reeds goedgekeurd)
- `src/components/customer-portal/ProgramSidebar.tsx` -- isPreApproval doorgeven (reeds goedgekeurd)
- `src/components/customer-portal/DesktopProgramView.tsx` -- isPreApproval doorgeven (reeds goedgekeurd)

Geen database-wijzigingen nodig.
