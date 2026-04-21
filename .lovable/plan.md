

## Probleem

Het kostenoverzicht in het klantportaal toont **€4.678,45**, het admin Financieel Overzicht toont **€4.761,69** — verschil **€83,24**.

Oorzaak: zodra je in admin "definitieve" factuurregels (`program_item_billing_lines`) toevoegt aan een item (bijv. om gesplitste BTW-tarieven 9%/21% correct vast te leggen), gebruikt alléén het admin-overzicht dat totaal. Het klantportaal kent die regels niet en blijft `quoted_price` / `admin_price_override` × aantal tonen.

Voor dit project gaat het om twee items:

| Item | Klantportaal | Admin (billing lines) | Verschil |
|---|---|---|---|
| Italiaanse shared dining @ Oliva | €400,50 (9 × €44,50) | €423,74 (€337 @9% + €86,74 @21%) | +€23,24 |
| Zaalhuur Brouwerij Fortuna | €598,95 (quoted_price) | €658,95 (zaal €598,95 + koffie/thee €60) | +€60,00 |

De billing lines zijn in dit geval het juiste totaal (klant betaalt straks ook €423,74 en €658,95). Het klantportaal toont dus te weinig.

## Aanpak

**`PriceSummaryCard` (klantportaal) gelijktrekken met `FinancialOverviewCard` (admin)** door `program_item_billing_lines` op te halen en — indien aanwezig per item — het regelsom-totaal te gebruiken in plaats van `quoted_price` / `admin_price_override`.

### Wijzigingen

1. **`src/components/customer-portal/PriceSummaryCard.tsx`**
   - Voeg een fetch toe (zelfde patroon als bestaande `vat_rate` fetch) die `program_item_billing_lines` ophaalt voor alle item-id's; resultaat in `linesByItem: Record<string, BillingLine[]>`.
   - In de `summary` `useMemo`: per item eerst checken of er billing lines zijn. Zo ja → gebruik de som van `amount_incl_vat` als `effectivePrice` en de som van `amount_excl_vat` / `vat_amount` per BTW-tarief in de BTW-uitsplitsing. Zo nee → huidige logica.
   - Gebruik in de UI-regel een subtiele "definitief" badge (zoals admin) zodat klant ziet dat dit een vaste eindprijs is.
   - Geen wijziging in regels voor coördinatiefee, toeristenbelasting, natuurbijdrage, opslag, logies.

2. **`src/components/customer-portal/CompactBillingSection.tsx`** + **`MobileProgramView.tsx`**
   - Geen wijziging nodig; `PriceSummaryCard` haalt zelf de billing lines op (zoals het nu ook zelf de `vat_rate`s ophaalt). Dit voorkomt prop-drilling.

3. **RLS check** — `program_item_billing_lines` heeft alleen admin-policies. Klantportaal werkt anoniem via token. We moeten een SELECT-policy toevoegen die regels leesbaar maakt zolang het bijbehorende `program_request` nog niet is verlopen, vergelijkbaar met andere "readable via active request" policies.

   ```sql
   CREATE POLICY "Billing lines readable via active request"
   ON program_item_billing_lines FOR SELECT TO anon, authenticated
   USING (EXISTS (
     SELECT 1 FROM program_request_items pri
     JOIN program_requests pr ON pr.id = pri.request_id
     WHERE pri.id = program_item_billing_lines.item_id
       AND pr.expires_at > now()
   ));
   ```

### Resultaat

Beide overzichten tonen straks exact **€4.761,69** voor dit project, met identieke BTW-uitsplitsing (9%-regels gesplitst van 21%-regels). De `Voltooiingsstatus → Openstaand` (die al `calculateProjectGrandTotal` gebruikt) blijft consistent omdat die al billing lines meeneemt.

### Niet in scope

- Geen herberekening van toeristenbelasting/natuurbijdrage; die volgen al `app_settings`.
- Geen wijziging aan admin-zijde of `projectFinancials.ts`.

