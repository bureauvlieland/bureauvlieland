## Doel
De klantweergave `/mijn-programma/:token` moet niet langer tegenstrijdige meldingen tonen over “goed te keuren”, “wacht op partners”, “akkoord” en “facturatie”. Voor projecten die al in `completion_status = ready_for_invoice` staan of waarvan de uitvoeringsdatum voorbij is, verschuift de focus naar facturatie/voorwaarden en verdwijnen goedkeur-acties uit klantnavigatie, stepper, badges, sticky bar en itemkaarten.

## Gevonden oorzaak bij dit project
Voor token `vXnYKZsgNzrY` staat het project in de database op:

- `completion_status = ready_for_invoice`
- `quote_status = akkoord_ontvangen`
- facturatiegegevens ontbreken
- voorwaarden ontbreken
- één item heeft nog `status = alternative`, maar heeft al `customer_approved_at` en `customer_accepted_at`

De hoofdkaart herkent inmiddels deels “uitgevoerd / facturatie”, maar andere UI-stukken rekenen nog los op itemstatussen en klant-approval-tellingen. Daardoor kan dezelfde pagina tegelijk zeggen: klaar voor facturatie, nog akkoord nodig, alternatief open, of wacht op partners.

## Plan

### 1. Eén centrale portal-status maken
Introduceer een centrale helper voor het klantportaal, bijvoorbeeld `getCustomerPortalStatus(program, items, accommodationQuotes, selectedDates)`, die in één object teruggeeft:

- `executionState`: future / in_progress / past_execution / invoicing
- `billingComplete`
- `termsAccepted`
- `guestDetailsIncomplete`
- `customerActionsCount`
- `customerApprovedCount`
- `customerApprovableCount`
- `programTrackDone`
- `showApprovalActions`
- `showPartnerWaiting`
- `primaryNextAction`
- labels/badges voor programma, akkoord, facturatie en stepper

Belangrijke regel:

```text
Als completion_status = ready_for_invoice|partially_invoiced|fully_invoiced
of executionState = past_execution:
  - geen klant-goedkeuracties meer tonen
  - geen “wacht op partners” meer tonen
  - programma-track is afgerond/uitgevoerd
  - facturatiegegevens en voorwaarden mogen wel open blijven
```

### 2. Bestaande losse berekeningen vervangen
Vervang in deze plekken de eigen tellingen door de centrale portal-status:

- `CustomerProgram.tsx` navigatiebadges
- `CustomerPortalSplash.tsx` traject-lint en intro-copy
- `DesktopProgramView.tsx`
- `MobileProgramView.tsx`
- `ActionRequiredCard.tsx`
- `ProgramStepper.tsx` input/tracklogica
- `tabHeaderConfig.ts`
- `MobileStickyStatus.tsx`

Daarmee krijgt desktop, mobiel, splash, tabheader, sticky bar en hoofdkaart exact dezelfde waarheid.

### 3. Itemkaarten blokkeren tegen oude akkoord-acties
Pas `CustomerProgramItem` / `deriveItemDisplayStatus` aan zodat een item in een facturatie- of post-execution-project niet meer terugvalt naar “Goedkeuring nodig” op basis van `status = alternative` of oude approvalvelden.

Voor klantweergave wordt dan bijvoorbeeld:

- uitgevoerd/facturatiefase: “Uitgevoerd” of “Afgerond voor facturatie”
- geen knop “Wijziging goedkeuren”
- geen bulkknop “Alle X onderdelen goedkeuren”
- geen “Andere tijd” als uitvoering al voorbij/facturatiefase is

### 4. Data-correctie voor bestaande projecten
Maak een veilige backend data-update voor projecten die al `ready_for_invoice` zijn of waarvan uitvoering voorbij is:

- open `program_request_items.status in ('pending','alternative','counter_proposed')` sluiten naar een consistente eindstatus
- `auto_closed_reason = 'auto_past_execution'` zetten waar passend
- `customer_approved_at` / `customer_accepted_at` niet wissen, maar niet meer als open actie interpreteren
- open pre-execution admin-todos sluiten
- facturatie-/voorwaarden-/gastgegevens-taken open laten

Voor dit concrete project betekent dat: het overgebleven `alternative` item wordt niet meer als open klantactie gezien.

### 5. Auto-close functie uitbreiden
Breid `auto-close-past-execution` uit zodat toekomstige regressies worden voorkomen:

- ook `counter_proposed` sluiten als pre-execution status
- ook projecten met `completion_status = ready_for_invoice` normaliseren, niet alleen datum-past
- `status_updated_at` en `status_note` expliciet zetten bij auto-close
- resultaatrapportage uitbreiden met aantallen per status

### 6. Regressietests toevoegen
Voeg tests toe voor de statushelper en auto-close:

- project `ready_for_invoice` + item `alternative` + accepted timestamps → 0 klantacties, facturatie-focus
- past execution + pending items → geen goedkeur-badges, wel billing-task indien incompleet
- future/offerte_verstuurd → goedkeuracties blijven zichtbaar
- akkoord_ontvangen + confirmed partner response vóór uitvoering → per-item goedkeuring blijft zichtbaar
- billing incomplete na uitvoering → facturatie blijft primaire actie
- terms incomplete na uitvoering → voorwaarden blijven zichtbaar na facturatiegegevens

### 7. Verificatie op de echte route
Na implementatie controleer ik `/mijn-programma/vXnYKZsgNzrY` visueel in de browser:

- geen “goed te keuren” badge meer
- geen itemknop “Wijziging goedkeuren”
- geen steppertekst “Bekijk en keur onderdelen goed”
- primaire melding focust op facturatiegegevens
- akkoord/voorwaarden blijft alleen open waar dat functioneel nog nodig is

## Verwacht resultaat
De klant ziet één consistente status: programma uitgevoerd / klaar voor facturatie, met alleen nog relevante acties. Oude partner- of goedkeurstatussen kunnen niet meer doorlekken in labels, badges of knoppen zodra het project in facturatie/post-execution zit.