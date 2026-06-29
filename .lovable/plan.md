## Geconsolideerd plan: status- en terminologieconsistentie klantportal (BV-2602-0005 als leidraad)

Eén samenhangend plan dat de 4 punten uit de afgelopen chats samenvoegt: (1) status-derivatie kloppend voor beide workflows, (2) re-approval na partner-prijswijziging, (3) badge ↔ knop in lijn, (4) terminologie "goedkeuren" vs "akkoord".

---

### 1. `src/lib/itemStatus.ts` — pre-offerte tak herschrijven (één bron van waarheid)

Vervangt de huidige regels 249-264 die alle niet-goedgekeurde items naar `wacht_op_klant` sturen. Nieuwe logica geldt voor `concept` / `in_afstemming` / `offerte_verstuurd` en is identiek voor admin én klant (audience-param blijft, maar speelt hier geen rol meer):

```text
Als !hasApproval && item.status !== 'alternative':
  - provider_id === 'bureau'
      → klant_akkoord_bureau   (Bevestigd, groen vinkje, geen knop)
  - partner heeft gereageerd
      (status === 'confirmed' OF quoted_price gevuld
       OF quoted_at gevuld OF partner_price_change_acknowledged_at gevuld)
      → wacht_op_klant          (Akkoord nodig + goedkeurknop)
  - anders (pending, geen prijs)
      → wacht_op_partner        (Wacht op aanbieder, geen knop)
```

Dekt beide workflows:
- Offerte → klant keurt goed → partner bevestigt → definitief akkoord
- Offerte → klant keurt goed → partner past prijs aan → opnieuw goedkeuren → definitief akkoord

Resultaat in BV-2602-0005: bureau-items "Bevestigd", Strandyoga/Fortuna/Strandspektakel "Akkoord nodig" + knop, Zeehondetocht "Wacht op aanbieder", admin en klant zien hetzelfde.

### 2. Sidebar/stepper-teller volgt automatisch

Verifiëren dat `useProgramStatus.ts` / `ProgramStepper.tsx` via `deriveItemDisplayStatus` rekenen. Zo ja: teller valt vanzelf op het juiste aantal (3 i.p.v. 5 in BV-2602-0005). Zo nee: zelfde regel daar toepassen.

### 3. Re-approval na partner-prijswijziging (Strandyoga-case)

**Klantportal — `src/components/customer-portal/CustomerProgramItem.tsx`:**

Nieuwe vlag `partnerHasResponded`:
```
!isSelfArranged
  && item.provider_id !== "bureau"
  && !item.customer_approved_at
  && (item.status === "confirmed" || item.status === "alternative")
  && (item.quoted_price != null || !!item.quoted_at
      || !!item.partner_price_change_acknowledged_at)
```

Bannertekst in 3 lagen:
- `status === 'alternative'` → bestaande tekst (tijd/prijs aangepast).
- `partnerHasResponded` → **"De aanbieder heeft uw eerdere akkoord verwerkt en een definitieve prijs van €X p.p. doorgegeven. Geef opnieuw akkoord om dit onderdeel definitief te bevestigen."**
- anders → bestaande generieke "we vragen beschikbaarheid en prijs op".

Goedkeurknop zelf ongewijzigd.

**Partner-notificatie — `supabase/functions/approve-quote-item/index.ts`:**

Zelfde `isReapprovalAfterPartnerResponse`-detectie. Bij `true`:
- Subject: `Klant akkoord op uw voorstel: {block_name} — {reference_number}`
- Body: bevestiging dat klant het aangepaste voorstel goedkeurt; vraag om in partnerportal definitief te bevestigen.
- Nieuwe template-naam: `program_partner_reapproval`.
- `program_request_history.notes`: "Klant heeft definitief akkoord gegeven op het aangepaste voorstel van {provider_name}."

Bestaande "first contact"-tak ongewijzigd.

### 4. Terminologie: "goedkeuren" eerste stap, "akkoord" laatste stap

In `src/components/customer-portal/ProposalHeroCard.tsx`:
- **Regel 127:** "zodra u akkoord geeft" → **"zodra u deze goedkeurt"**.
- **Regel 149:** "Ik ga akkoord met dit programmavoorstel en de getoonde indicatieve prijzen." → **"Ik keur dit programmavoorstel met de getoonde indicatieve prijzen goed."**
- **Regel 151:** sub-tekst over "bevestiging door aanbieders én ondertekening" blijft — verwijst correct naar de eindstap.
- **Regel 174 (knop):** "Akkoord op het hele programma" → **"Programma goedkeuren"**.

Stepper, badges en per-item knoppen gebruiken al "goedkeuren / goedgekeurd" voor de eerste fase en "Akkoord" voor de laatste fase — niet aanraken.

### 5. Unit-tests

`src/lib/__tests__/itemStatus.test.ts`:
- in_afstemming + bureau + geen approval → `klant_akkoord_bureau`
- in_afstemming + partner + pending + geen prijs → `wacht_op_partner`
- in_afstemming + partner + confirmed + quoted_price → `wacht_op_klant`
- offerte_verstuurd + partner + pending → `wacht_op_partner`
- offerte_verstuurd + partner + confirmed + acknowledged + geen approval → `wacht_op_klant`

### 6. Verificatie

- Klantpagina BV-2602-0005: bureau-onderdelen "Bevestigd", Zeehondetocht "Wacht op aanbieder", 3 partner-items met goedkeurknop, sidebar telt 3.
- Strandyoga-banner toont de nieuwe re-approval tekst met €190.
- Hero-CTA en checkbox tonen "goedkeuren"-terminologie.
- Admin-detailpagina BV-2602-0005 toont identieke statussen.
- Edge function-test: re-approval triggert `program_partner_reapproval` mail.

### Out of scope

- Geen wijziging aan goedkeurknop-logica zelf, edge functions buiten `approve-quote-item`, of `quote_status`-transities.
- Geen nieuwe DB-kolommen — alle signalen bestaan al op `program_request_items`.
- Stepper-kopje "Akkoord" blijft staan voor de eindfase.
