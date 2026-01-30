

# Plan: Akkoord-Workflow voor Maatwerkvoorstellen + Partner-notificaties

## Huidige Situatie

### Wat WEL werkt:
- Admin maakt maatwerk programma aan (`program_type: "quote"`)
- Admin voegt activiteiten toe met `skip_partner_notification: true` (partners worden NIET genotificeerd)
- Admin stuurt PDF-voorstel naar klant via `send-quote-offer` 
- `quote_status` wordt bijgewerkt naar `offerte_verstuurd`

### Wat ONTBREEKT:
1. **Klant-akkoord knop**: Er is geen "Ik ga akkoord met dit voorstel" knop in het klantportaal
2. **Partner-notificatie trigger**: Na klant-akkoord moeten partners genotificeerd worden over hun activiteiten
3. **Tekst correctie**: PDF en e-mail vermelden "beschikbaarheidsgarantie" terwijl partners nog niet uitgevraagd zijn

---

## Oplossing: Nieuwe Akkoord-Flow

```text
WORKFLOW NA IMPLEMENTATIE:

┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  Admin stuurt       │────▶│  Klant ziet         │────▶│  Partners ontvangen │
│  programmavoorstel  │     │  voorstel + geeft   │     │  notificatie        │
│                     │     │  akkoord            │     │                     │
│  quote_status:      │     │  quote_status:      │     │  items worden       │
│  offerte_verstuurd  │     │  akkoord_ontvangen  │     │  'pending'          │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

---

## Technische Implementatie

### 1. Nieuwe Component: `AcceptQuoteProposalCard`

**Doel:** Toont een duidelijke call-to-action aan de klant om het voorstel te accepteren.

**Tonen wanneer:**
- `program_type === "quote"`
- `quote_status === "offerte_verstuurd"`
- `quote_valid_until` is nog niet verstreken

**Inhoud:**
- Samenvatting: aantal activiteiten, totaal geschat bedrag
- Geldigheidsdatum prominente weergave
- "Akkoord, start reserveringen" primaire knop
- Uitleg: "Na uw akkoord worden de leveranciers benaderd voor definitieve bevestiging"

### 2. Hook Update: `useCustomerProgram`

**Nieuwe functie toevoegen:**
```typescript
acceptQuoteProposal: () => Promise<boolean>;
```

**Actie:**
- Roept nieuwe edge function aan: `accept-quote-proposal`
- Retourneert success/error

### 3. Nieuwe Edge Function: `accept-quote-proposal`

**Input:**
```typescript
{ token: string; origin?: string }
```

**Acties:**
1. Valideer dat programma bestaat en `quote_status === "offerte_verstuurd"`
2. Controleer of `quote_valid_until` niet verstreken is
3. Update `quote_status` naar `akkoord_ontvangen`
4. Voor elk item met `skip_partner_notification: true`:
   - Zet `skip_partner_notification` naar `false`
   - Zet status naar `pending` (indien nog niet)
   - Stuur notificatie naar partner
5. Log in `program_request_history`
6. Stuur bevestigingsmail naar klant

### 4. Partner Notificatie E-mail

**Hergebruik bestaande logica** uit `send-program-request`:
- "Nieuwe aanvraag via Bureau Vlieland"
- Klantgegevens + datum + aantal personen
- Lijst van aangevraagde activiteiten
- Link naar Partner Portal

### 5. Tekst Correcties

**AdminQuotePreview.tsx (PDF):**
```
Oud: "Na deze datum kunnen wij de beschikbaarheid niet garanderen."
Nieuw: "Als u akkoord bent met dit programmavoorstel, kunt u dit bevestigen 
       in uw klantomgeving. Hierna worden de leveranciers op de hoogte gebracht."
```

**send-quote-offer/index.ts (E-mail):**
```
Oud: Rode waarschuwing over beschikbaarheid
Nieuw: Amber informatieve melding over workflow
```

---

## UI Plaatsing

### Desktop (DesktopProgramView):
- `AcceptQuoteProposalCard` bovenaan, direct onder `ProgramOverviewCard`
- Vervangt `ActionRequiredCard` wanneer quote-modus actief is

### Mobile (MobileProgramView):
- Prominent bovenaan, boven de dag-tabbladen
- Sticky "Akkoord" knop onderaan scherm (optioneel)

---

## Implementatiestappen

| # | Bestand | Actie |
|---|---------|-------|
| 1 | `src/components/customer-portal/AcceptQuoteProposalCard.tsx` | **Nieuw** - Akkoord component voor klant |
| 2 | `src/hooks/useCustomerProgram.ts` | Voeg `acceptQuoteProposal()` functie toe |
| 3 | `supabase/functions/accept-quote-proposal/index.ts` | **Nieuw** - Edge function voor akkoord + partner notificaties |
| 4 | `supabase/config.toml` | Registreer nieuwe edge function |
| 5 | `src/components/customer-portal/DesktopProgramView.tsx` | Integreer AcceptQuoteProposalCard |
| 6 | `src/components/customer-portal/MobileProgramView.tsx` | Integreer AcceptQuoteProposalCard |
| 7 | `src/pages/admin/AdminQuotePreview.tsx` | Corrigeer validiteitstekst |
| 8 | `supabase/functions/send-quote-offer/index.ts` | Corrigeer e-mail validiteitstekst |

---

## Gedetailleerde Technische Specificaties

### AcceptQuoteProposalCard Component

```typescript
interface AcceptQuoteProposalCardProps {
  program: ProgramRequestWithItems;
  onAccept: () => Promise<boolean>;
  isLoading?: boolean;
}

// Visueel ontwerp:
// - Achtergrond: gradient van blauw naar wit
// - Icoon: groot vinkje of handshake
// - Titel: "Uw maatwerkvoorstel"
// - Subtitel: "[X] activiteiten • Geschat totaal €[bedrag]"
// - Geldig tot: badge met datum
// - Primaire knop: "Akkoord, start reserveringen"
// - Secundaire tekst: "De leveranciers worden hierna benaderd"
```

### accept-quote-proposal Edge Function

```typescript
// Pseudo-code structuur:
Deno.serve(async (req) => {
  // 1. Parse token
  const { token, origin } = await req.json();
  
  // 2. Fetch program
  const program = await fetchProgramByToken(token);
  
  // 3. Validaties
  if (program.quote_status !== "offerte_verstuurd") {
    return error("Voorstel kan niet geaccepteerd worden");
  }
  if (new Date(program.quote_valid_until) < new Date()) {
    return error("Dit voorstel is verlopen");
  }
  
  // 4. Update quote_status
  await supabase.from("program_requests").update({
    quote_status: "akkoord_ontvangen",
    updated_at: new Date().toISOString(),
  }).eq("id", program.id);
  
  // 5. Fetch items met skip_partner_notification
  const items = await supabase.from("program_request_items")
    .select("*")
    .eq("request_id", program.id)
    .eq("skip_partner_notification", true);
  
  // 6. Groepeer per partner
  const partnerGroups = groupItemsByProvider(items);
  
  // 7. Stuur notificaties per partner
  for (const [partnerId, partnerData] of partnerGroups) {
    // Update items
    await supabase.from("program_request_items")
      .update({ 
        skip_partner_notification: false,
        status: "pending",
        status_updated_at: new Date().toISOString(),
      })
      .in("id", partnerData.itemIds);
    
    // Stuur e-mail
    await sendPartnerNotification(partner, program, partnerData.items);
  }
  
  // 8. Log history
  await supabase.from("program_request_history").insert({
    request_id: program.id,
    action: "quote_accepted",
    actor: "customer",
    actor_name: program.customer_name,
    notes: `Klant heeft voorstel geaccepteerd. ${items.length} partners genotificeerd.`,
  });
  
  // 9. Bevestigingsmail naar klant
  await sendCustomerConfirmation(program);
  
  return success();
});
```

### Partner Notificatie E-mail Template

Hergebruikt styling van bestaande `program_request_partner` template:
- Koptekst: Navy blauw met "Bureau Vlieland"
- Klantgegevens sectie
- Datums + aantal personen
- Aangevraagde activiteiten lijst
- Link naar Partner Portal
- Disclaimer: "Dit is een vrijblijvende aanvraag"

---

## Klant-ervaring na implementatie

```text
STAP 1: Klant ontvangt e-mail met PDF voorstel
        └── "Bekijk voorstel & geef akkoord" knop

STAP 2: Klant opent klantportaal
        └── Ziet AcceptQuoteProposalCard bovenaan
        └── "X activiteiten • Geschat €X.XXX"
        └── "Geldig tot [datum]"
        └── [AKKOORD, START RESERVERINGEN] knop

STAP 3: Na klik op Akkoord
        └── Laadstatus: "Partners worden geïnformeerd..."
        └── Succes: Toast "Voorstel geaccepteerd! De leveranciers zijn geïnformeerd."
        └── AcceptQuoteProposalCard verdwijnt
        └── ActionRequiredCard toont: "Wachten op bevestiging van X aanbieders"

STAP 4: Normale workflow
        └── Partners reageren (bevestigen/alternatief)
        └── Klant accepteert per activiteit
        └── Facturatiegegevens invullen
        └── Voorwaarden accepteren
        └── Boeking compleet
```

---

## Randgevallen

### Verlopen voorstel
- Toon `AcceptQuoteProposalCard` met disabled state
- Tekst: "Dit voorstel is verlopen op [datum]. Neem contact op voor een nieuw voorstel."
- Geen akkoord-knop

### Geen items in voorstel
- Toon geen AcceptQuoteProposalCard
- Edge case: zou niet moeten voorkomen

### Klant is al akkoord
- `quote_status === "akkoord_ontvangen"`
- Toon geen AcceptQuoteProposalCard
- Normale ActionRequiredCard toont voortgang

