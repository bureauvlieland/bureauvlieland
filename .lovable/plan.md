
# Definitieve klant-workflow programma-portaal

Doel: één heldere flow met consistente statussen, labels en teksten. Geen tegenstrijdige banners meer.

## De 5 fasen

```text
1. concept              (intern, klant ziet nog niks bruikbaars)
2. offerte_verstuurd    → klant moet voorstel goedkeuren
3. akkoord_ontvangen    → Bureau vraagt partners om beschikbaarheid
4. definitief_bevestigd → partners ok, klant moet voorwaarden tekenen
5. afgerond / getekend  → boeking definitief
```

`quote_status` op `program_requests` is de bron van waarheid. Per fase: één duidelijke banner, één bedoelde actie.

## Wat klant per fase ziet

| Fase | Hoofdbanner (boven) | Per-item knop | Bottom-card |
|---|---|---|---|
| 1 concept | "Uw programma wordt voorbereid" (neutraal grijs) | Geen | Niets |
| 2 offerte_verstuurd | "Voorstel klaar — geef akkoord" (amber) + grote knop | Geen knop, alleen **"Wacht op uw akkoord"** chip op partner-items; bureau-items tonen **"Bevestigd"** | "Programmavoorstel met indicatieve prijzen" + checkbox + "Akkoord — vraag beschikbaarheid op" |
| 3 akkoord_ontvangen | "Aanvragen verstuurd naar aanbieders" (blauw) — alléén hier | Partner-items met `status=confirmed/alternative` zonder `customer_accepted_at` → groene **"Goedkeuren"** of **"Wijziging goedkeuren"** knop | Niets |
| 4 alle partners ok, nog niet getekend | "Programma gereed voor ondertekening" (groen) | Geen | Niets — actie zit in Akkoord-tab |
| 5 getekend | "Uw boeking is compleet!" | Geen | Niets |

## Regel: bureau-items zijn automatisch akkoord

Bureau-onderdelen (`provider_id = 'bureau'`, niet `self_arranged`) krijgen direct bij aanmaak:
- `status = 'confirmed'`
- `customer_approved_at = now()` (zodra klant het voorstel goedkeurt in fase 2 → 3)
- `customer_accepted_at = now()` (idem)

Effect: klant ziet "Bevestigd" zonder knop. Tellen niet mee in `customerActionsCount`. Bureau-items horen nooit in de "x van y onderdelen goed te keuren" teller.

## Concrete fixes in de code

### A. `src/components/customer-portal/ActionRequiredCard.tsx`
1. `isQuotePreApproval` niet meer afhankelijk maken van `programType === "quote"`. Iedere `quote_status` is leidend (alle projecten lopen door dezelfde quote-pipeline). Vervang door: `const isQuotePreApproval = !!quoteStatus && ["concept","in_afstemming","offerte_verstuurd"].includes(quoteStatus);`
2. Voeg een nieuwe expliciete tak toe voor `quoteStatus === "offerte_verstuurd"`: amber banner *"Voorstel klaar — geef akkoord op uw programma"* met CTA die scrolt naar de voorstel-card. Krijgt prioriteit boven de pending-check.
3. De pending-tak ("Aanvragen verstuurd naar aanbieders") mag alléén tonen als `quoteStatus` in `['akkoord_ontvangen','definitief_bevestigd']` ligt EN `isPublished`. Anders nooit.
4. "Uw aanvraag wordt beoordeeld" tak verwijderen — die overlapt met fase 1/2 en wordt nu verkeerd getoond.

### B. `src/components/customer-portal/ProgramIntroCard.tsx`
1. De "Programmavoorstel met indicatieve prijzen" card moet **boven** de programma-lijst staan in fase 2, niet eronder. Verplaatsen in `DesktopProgramView.tsx` en `MobileProgramView.tsx`: `<ProgramIntroCard …/>` vlak na `ActionRequiredCard` (regel 309 in Desktop), in plaats van na de programma-Card (regel 519).
2. Na fase 2 (= zodra `quote_status === "akkoord_ontvangen"`) deze card volledig verbergen — niet meer renderen.
3. Confirmed-variant (regel 185-195) wijzigen: alleen tonen als `termsAccepted === true`. Anders niets.

### C. `src/components/customer-portal/CustomerProgramItem.tsx`
1. `needsCustomerAction` uitsluiten voor bureau-items: voeg `&& item.provider_id !== "bureau"` toe (regel 110).
2. Per-item "Dit onderdeel goedkeuren" knop alleen tonen in fase 3 (`quoteStatus === "akkoord_ontvangen"`). In fase 2 toont het bottom-akkoord de bulk-actie; per-item knoppen werken dan misleidend.
3. Bureau-items: badge "Bevestigd" blijft, knop weg. Eventueel kleine grijze regel: *"Door Bureau Vlieland geregeld — geen actie nodig."*

### D. `src/hooks/useProgramStatus.ts`
1. `customerActionableItems` en `customerApprovableTotal`: bureau-items uitsluiten via `i.provider_id !== "bureau"`.
2. Nieuwe afgeleide: `isProposalPhase = quote_status === "offerte_verstuurd"`, `isApprovalPhase = quote_status === "akkoord_ontvangen"`. Doorgeven naar Desktop/Mobile views.

### E. Acceptatie van voorstel (fase 2 → 3) — `useCustomerProgram` / `acceptQuoteProposal`
Bij klant-akkoord op het hele voorstel:
- `quote_status` → `akkoord_ontvangen`
- voor alle bureau-items (`provider_id='bureau'`, niet self_arranged): zet `customer_approved_at = customer_accepted_at = now()` en `status = 'confirmed'` als die nog pending stond.
- partners notificatie versturen voor niet-bureau, niet-self_arranged items met `status=pending` (bestaande edge function).

### F. Per-item goedkeuren (fase 3) — `approveQuoteItem`
- Zet zowel `customer_approved_at` als `customer_accepted_at` (één klik = klant zegt definitief ja op dit onderdeel).
- Geen aparte stap meer voor "akkoord met partner-bevestiging" — dat veroorzaakt nu verwarring.

### G. Bulk-knop in programma-header (DesktopProgramView regel 392)
Knop alleen tonen in fase 3 (`isApprovalPhase`) met label *"Geef akkoord op alle {n} partner-onderdelen"*. In fase 2 verbergen (bulk-akkoord zit dan in IntroCard bovenaan).

### H. Sidebar-stepper (`ProgramStepper`)
Stappen 1-op-1 mappen op de 5 fasen. "Onderdelen goedkeuren" actief in fase 3, niet eerder.

## Volgorde van uitvoer

1. `useProgramStatus.ts` — bureau-items uitsluiten, fase-flags toevoegen.
2. `ActionRequiredCard.tsx` — banner-logica per fase strak.
3. `ProgramIntroCard.tsx` + view-bestanden — verplaatsen naar boven, verbergen vanaf fase 3.
4. `CustomerProgramItem.tsx` — bureau-items geen knop, per-item knop alleen in fase 3.
5. `DesktopProgramView.tsx` + `MobileProgramView.tsx` — bulk-knop conditie.
6. `useCustomerProgram.ts` (`acceptQuoteProposal`) — bureau-items auto-approve bij voorstel-akkoord.
7. Migratie/backfill: bestaande projecten in `akkoord_ontvangen` waar bureau-items nog `customer_approved_at IS NULL` hebben → backfillen, zodat klanten zoals NHL Stenden de huidige toestand correct zien.
8. Smoke-test met token van NHL Stenden in preview.

## Wat de klant straks ziet bij NHL Stenden (huidige case)

Project staat in fase 2 (`offerte_verstuurd`):
- Bovenaan: amber banner "Voorstel klaar — geef akkoord op uw programma" + scroll naar voorstel-card.
- Vlak eronder: "Programmavoorstel met indicatieve prijzen" met checkbox + groene knop (verplaatst van onder naar boven).
- Programma-lijst: bureau-items "Bevestigd" (geen knop), partner-items chip "Wacht op uw akkoord".
- Geen misleidende "Aanvragen verstuurd naar aanbieders"-banner meer.
- Onderaan: niets dubbel.

Zodra klant op de groene akkoord-knop drukt → fase 3:
- Banner wisselt naar "Aanvragen verstuurd naar aanbieders".
- Bureau-items blijven "Bevestigd".
- Partner-items krijgen per onderdeel een groene "Goedkeuren"-knop zodra de partner reageert.
