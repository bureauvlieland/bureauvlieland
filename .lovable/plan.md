# Klant-akkoord op programmavoorstel: bug fix + workflow herijken

## Wat blijkt na nader onderzoek

De vorige analyse moet bijgesteld. **`AcceptQuoteProposalCard` wordt nergens gemount**; de echte akkoord-knop zit in `ProgramIntroCard`. De knop verschijnt alleen wanneer `hasQuoteItemsAwaitingCustomerApproval(items) === true`, en die helper eist:

```ts
item.status === "confirmed" || item.status === "alternative"
&& item.item_quote_status in ("in_afstemming","bevestigd")
```

Met andere woorden: **de klant kan pas akkoord geven nádat een partner het item bevestigd heeft**. Maar bij projecten in fase `offerte_verstuurd` zijn er nog géén partners benaderd (skip_partner_notification staat op true tot de klant akkoord is). Resultaat → eeuwige patstelling.

DB-bevestiging (10 actieve projecten met `quote_status=offerte_verstuurd`):

| Referentie | Items actief | Approvable | Pending | Klant kan akkoord? |
|---|---|---|---|---|
| BV-2602-0002 | 11 | 0 | 11 | **nee** |
| BV-2602-0003 | 20 | 0 | 20 | **nee** |
| BV-2602-0004 | 11 | 0 | 11 | **nee** ← screenshot |
| BV-2603-0007 | 10 | 0 | 10 | **nee** |
| BV-2603-0016 | 11 | 0 | 11 | **nee** |
| BV-2603-0018 | 7 | 0 | 7 | **nee** |
| BV-2604-0003 | 15 | 0 | 15 | **nee** |
| BV-2604-0004 | 13 | 0 | 13 | **nee** |
| BV-2604-0006 | 6 | 0 | 5 + 1 reeds approved | gedeeltelijk |
| BV-2603-0003 | 10 | 1 | 0 | ja (reeds 7 approved) |

→ De huidige logica **werkt voor geen enkel project in de "offerte verstuurd"-fase**. Klanten zien een verklarende tekst maar geen knop.

## Wat ik ga doen

### Reparatie 1 — `customerQuoteApproval.ts` in lijn met de bedoelde workflow

De bedoelde flow is: voorstel → **klant-akkoord op voorstel** → partners benaderen → partner bevestiging → AV-akkoord → definitief. Het klant-akkoord op een voorstel is een **niet-bindende handtekening op het programma met indicatieve prijzen**, niet pas mogelijk ná partnerbevestiging.

```ts
// Nieuwe regel: een item is "klaar voor klant-akkoord" als
// - niet geannuleerd
// - klant heeft nog geen akkoord gegeven
// - partner heeft het nog niet onhaalbaar gemaakt (status != cancelled)
// pending/confirmed/alternative — allemaal goed
export const isQuoteItemAwaitingCustomerApproval = (item) => {
  if (item.status === "cancelled") return false;
  if (item.customer_approved_at) return false;
  if (item.block_type === "self_arranged") return false;
  return true;
};
```

Effect: alle 10 projecten krijgen direct een werkende akkoord-knop in `ProgramIntroCard`.

### Reparatie 2 — `ProgramIntroCard` herformuleren tot "voorstel met indicatieve prijzen"

Tekst en knop versoepelen om de zwaarte weg te nemen. Concept:

- Titel/intro: *"Hieronder vindt u uw programmavoorstel met indicatieve prijzen. Dit is nog géén definitieve boeking — geeft u akkoord, dan vragen wij voor u beschikbaarheid op bij elke aanbieder. U beslist later definitief, na ondertekening van de algemene voorwaarden."*
- Driestappen-uitleg: 1) Wij benaderen alle aanbieders, 2) U ziet hier per onderdeel de bevestiging, 3) Pas bij ondertekenen AV is alles definitief.
- Checkbox-tekst: *"Ik ga akkoord met dit voorstel"* (i.p.v. "Ik ben akkoord met alle resterende onderdelen").
- Knop: **"Akkoord — vraag beschikbaarheid op"** (i.p.v. "Alle resterende akkoord geven").
- Subtekst: *"Niet-bindend. Definitieve boeking volgt pas na ondertekening van de algemene voorwaarden."*
- "Geldig tot"-badge blijft.

### Reparatie 3 — `StatusSummary.tsx` checklist labels kloppend maken

Zolang `quote_status === "offerte_verstuurd"` en de klant nog geen akkoord heeft gegeven:
- "Programma"-rij: label wordt **"Wachten op uw akkoord ({n} onderdelen)"** met info-icoon, niet meer "Wachten op aanbieders".
- "Uw akkoord"-rij: label wordt **"Voorstel beoordelen"** → na akkoord: **"Voorstel akkoord ✓"**.

Pas zodra `quote_status === "akkoord_ontvangen"` switcht "Programma" naar **"Wachten op aanbieders ({confirmed}/{total} bevestigd)"**.

### Reparatie 4 — Offerte-PDF prominenter

Op desktop staat `Bekijk offerte` nu als kleine outline-knop tussen drie andere icoontjes. Dat blijft, maar binnen `ProgramIntroCard` (de paarse kaart bovenaan) komt er een primaire knop **"Bekijk offerte (PDF)"** naast de akkoord-knop, zichtbaar wanneer `program.quote_pdf_url` bestaat. Klant heeft de offerte dan letterlijk binnen handbereik bij de akkoord-knop.

### Eenmalige actie — admin-todos voor 4 PDF-loze projecten

BV-2602-0003, BV-2602-0004, BV-2604-0004, BV-2603-0003 hebben `quote_pdf_path = NULL` terwijl ze al wel als `offerte_verstuurd` zijn gemarkeerd. Ik voeg via migratie een admin-todo toe per project: *"Offerte-PDF ontbreekt — alsnog genereren en versturen aan klant"* met priority `high`, `auto_type='missing_quote_pdf'`, `auto_entity_id=request_id`.

## Bestanden

- `src/lib/customerQuoteApproval.ts` — versoepelde regel
- `src/components/customer-portal/ProgramIntroCard.tsx` — tekst + PDF-knop + button-label
- `src/components/customer-portal/StatusSummary.tsx` — checklist labels contextueel
- `supabase/migrations/...` — INSERT 4 admin_todos

## Verificatie

Na de wijzigingen open ik in de preview het klantportaal van BV-2602-0004 (`token=KSHU9ndXD5Ey`) en BV-2603-0016 (`token=hYNagEhaymRh`) en controleer dat:
1. de akkoord-knop verschijnt,
2. de checklist "Wachten op uw akkoord" toont i.p.v. "Wachten op aanbieders",
3. (alleen 0016) de PDF-knop staat naast de akkoord-knop.

Ik ga nu door met de implementatie.
