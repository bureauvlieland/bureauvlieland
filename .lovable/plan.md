## Doel

De klant kan **Gegevens & voorwaarden** vanaf dag 1 invullen (parallel spoor), en Bureau Vlieland kan per partner-activiteit kiezen of de aanvraag **direct uitgaat** of **wacht op klantgoedkeuring**. Logies-uitvraag blijft ongewijzigd (capaciteitsdruk).

## Eindbeeld in de klantportaal-stepper

```text
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ LOGIES (bij meerdaags)      │  │ GEGEVENS & VOORWAARDEN      │
│  • Aanvraag ingediend       │  │  • Bedrijfsgegevens         │
│  • Offertes vergelijken     │  │  • Voorwaarden ondertekenen │
│  • Logies vastgelegd        │  │  → altijd actief, eigen CTA │
└─────────────────────────────┘  └─────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ PROGRAMMA                                                   │
│  1. Onderdelen goedkeuren     (eerst — klant aan zet)       │
│  2. Aanbieders bevestigen     (na admin-uitvraag)           │
└─────────────────────────────────────────────────────────────┘
```

Definitief = alle drie de sporen 'gereed' (volgorde maakt niet uit).

---

## Wijzigingen

### 1. Admin: keuze per item bij uitvraag

In `AdminRequestDetail.tsx` (de "Bekijk & verstuur"-preview en de per-item knop):

- Voeg per partner-item een radio-keuze toe:
  - **"Nu reserveren"** — partner-aanvraag gaat meteen uit (huidig gedrag)
  - **"Wachten op klantgoedkeuring"** — `skip_partner_notification` blijft `true`, item krijgt vlag `awaiting_customer_for_partner_send = true`
- Bij bulk-versturen blijven items met "wachten" achter en gaan niet mee.
- In de item-lijst (admin) toont een nieuw badge "⏳ Wacht op klant" voor deze items.

Database-impact: nieuwe kolom `awaiting_customer_for_partner_send boolean default false` op `program_request_items` (puur intentie-vlag voor admin; geen RLS-impact omdat klant deze niet ziet).

### 2. Edge function: auto-versturen bij klantgoedkeuring

`approve-quote-item/index.ts` doet al `skip_partner_notification = false` in het admin_override pad. Uitbreiden:

- Wanneer een klant een item goedkeurt **en** `awaiting_customer_for_partner_send = true` **en** het item heeft een echte `provider_id` (geen `bureau`):
  - Roep intern `send-items-to-partners` aan met `mode: "force"` voor dit ene item.
  - Reset de vlag.
- Bestaand gedrag voor niet-gemarkeerde items blijft hetzelfde (geen automatische verzending; admin houdt regie).

### 3. Bulk-goedkeuren in klantportaal

Nieuwe knop **"Alle onderdelen goedkeuren"** boven de programma-lijst in `CustomerProgramItem`-container (`DesktopProgramView` + `MobileProgramView`):

- Roept `approve-quote-item` in lus aan voor alle items waar `needsCustomerAction === true`.
- Toont één toast met samenvatting ("8 onderdelen goedgekeurd, 2 worden nu naar aanbieders gestuurd").

### 4. ProgramStepper: nieuwe structuur

`src/components/customer-portal/ProgramStepper.tsx`:

- **Splits "Gegevens & voorwaarden" af** als een derde track (naast Logies + Programma), altijd actief vanaf dag 1.
- **Wissel volgorde** binnen de Programma-track: eerst "Onderdelen goedkeuren", dan "Aanbieders bevestigen".
- Stepper-logica:
  - `approveDone` = alle approvable items hebben `customer_approved_at`.
  - `providersDone` = alle items hebben definitieve partner-status (geen pending/alternative/counter).
  - "Aanbieders bevestigen" toont sublabel "Wij benaderen aanbieders zodra u goedkeurt" zolang `approveDone === false` en er ≥1 item is met `awaiting_customer_for_partner_send`.

### 5. Copy-aanpassingen (klanttekst)

- Gegevens-track statusregel: *"U kunt deze gegevens nu alvast invullen — dat versnelt de boeking."*
- Programma-track als nog niets goedgekeurd: *"Bekijk en keur uw programma-onderdelen goed. Wij benaderen aanbieders zodra u akkoord gaat."*
- "Definitief"-badge alleen wanneer Logies (indien van toepassing) + Programma + Gegevens & voorwaarden alle drie `done`.

---

## Wat blijft ongewijzigd

- Logies-uitvraag (`send-accommodation-quote-request`) — capaciteit op het eiland; gaat direct uit zodra admin de partners selecteert.
- Bureau-items (ferries, fietsen, kostenposten) — interne items, geen partner-uitvraag.
- Bestaande "wijzigingen publiceren"-flow uit eerdere sessie blijft intact.
- Silence=Agreement na 7 dagen, e-mailtemplates, facturatie.

---

## Bestanden (technisch)

| Bestand | Aard van wijziging |
|---|---|
| `supabase/migrations/<new>.sql` | Kolom `awaiting_customer_for_partner_send` op `program_request_items` |
| `src/pages/admin/AdminRequestDetail.tsx` | Keuze "nu/wachten" in send-preview en per-item menu; nieuwe badge |
| `supabase/functions/send-items-to-partners/index.ts` | Filter items met `awaiting_customer_for_partner_send = true` uit bulk-flow |
| `supabase/functions/approve-quote-item/index.ts` | Trigger auto-send naar partner als vlag gezet |
| `src/components/customer-portal/ProgramStepper.tsx` | Splits gegevens-track af, herorden programma-track |
| `src/components/customer-portal/DesktopProgramView.tsx` + `MobileProgramView.tsx` | Nieuwe bulk-approve knop; aangepaste props |
| `src/hooks/useCustomerProgram.ts` | `bulkApproveQuoteItems()` helper |
| `src/hooks/useProgramStatus.ts` | "allDone"-logica meenemen van losse gegevens-track |

## Risico's

- **Vergeten item-vlag** — als admin per ongeluk alles op "wachten" zet en de klant nooit goedkeurt, gaat er niets uit. Mitigeren met bestaande "stale_pending_change"-todo + extra todo "Items wachten >7d op klantgoedkeuring".
- **Email-volume bij bulk-approve** — 10 items = 10 partner-mails in korte tijd. Mitigeren door in `approve-quote-item` per provider te groeperen voordat we `send-items-to-partners` aanroepen.

## Niet in deze plan

- Aparte deellevering / aanbetaling-facturen (los traject).
- Wijziging hoe partners alternatieven voorstellen.
