## Wat is er aan de hand bij BV-2603-0003

Audit trail van bv. **Overtocht Harlingen → Vlieland** (item `eeda0c72…`):

```
12:11:30  partner Bureau Vlieland bevestigt voor €503,58   → quoted_price=503,58
12:31:34  klant Milou geeft akkoord                         → customer_approved_at gezet
13:13:06  admin past prijs aan naar €570,60                 → admin_price_override gezet
                                                              (GEEN nieuwe history-regel,
                                                               GEEN partner-acknowledge)
```

En bij **Strand BBQ** (item `2eb885d5…`):

```
2026-03-19  partner Zuiver Traiteur bevestigt €1.300       → quoted_price=1300
2026-03-24  klant geeft akkoord                            → customer_approved_at
2026-03-30  admin past prijs aan naar €30 p.p. (×29 = €870) → admin_price_override
            (verschil van €430 t.o.v. quoted_price → "open" change)
```

### De daadwerkelijke bug

`hasOpenAdminPriceChange()` is technisch correct: er ligt een nieuwere admin-prijs die nog niet door de partner is geacknowledged én die materieel afwijkt van `quoted_price`. Dus de banner "Prijs gewijzigd, geef opnieuw uw akkoord" verschijnt.

Maar:

1. **De klant kan niets doen.** `needsCustomerAction` checkt o.a. `!item.customer_accepted_at`. Op deze items is `customer_accepted_at` al gezet (gebeurt tegelijk met `customer_approved_at` per de centrale workflow-regel). Dus de "Akkoord met nieuwe prijs"-knop wordt nooit gerenderd.
2. **De boodschap is misleidend.** De prijswijziging is niet door de partner doorgegeven; het is een interne admin-correctie die nog niet via de partner is "geofficialiseerd". De klant heeft akkoord gegeven op de prijs die de partner had bevestigd — en zolang niemand die prijs publiekelijk wijzigt richting de klant is er feitelijk geen herbevestiging nodig.
3. **Bij Strand BBQ is de admin-override eigenlijk een correctie omlaag** (€1.300 → €870). Geen reden om de klant lastig te vallen.

Kort: een **interne admin-prijscorrectie** zou nooit als "klant moet opnieuw akkoord geven" mogen lekken naar het klantportaal als de klant al akkoord heeft gegeven en `customer_accepted_at` is gezet. Dat is bureau-werk, geen klantactie.

## Oplossing

### 1. `priceChangeNeedsAttention` strenger maken in het klantportaal

In `src/components/customer-portal/CustomerProgramItem.tsx`:

```ts
const priceChangeNeedsAttention =
  !isSelfArranged
  && !item.customer_accepted_at        // ← NIEUW: geaccepteerd = geen klantactie meer
  && hasOpenAdminPriceChange(item, numberOfPeople ?? 1, selectedDates.length || 1);
```

Effect: zodra `customer_accepted_at` is gezet, verdwijnen de "Prijs gewijzigd"-badge én de amber banner. De interne admin-correctie blijft bestaan in de back-office, maar de klant ziet alleen "U hebt akkoord gegeven op dit voorstel".

Hetzelfde geldt voor `PriceSummaryCard.tsx` — daar dezelfde guard toevoegen zodat de samenvattingstotalen niet onnodig de "wijziging"-styling krijgen.

### 2. `needsCustomerAction` consistent houden

Diezelfde guard verwijdert tegelijk de inconsistentie (badge zegt "actie nodig" maar er is geen knop, want `customer_accepted_at` blokkeert de knop). Niet langer nodig om de knop-conditie te verruimen.

### 3. Admin-zijde — signaleren dat de partner nog moet bijtekenen

Aan de admin/partner-kant blijft `hasOpenAdminPriceChange()` precies wat het nu is. Daar is het terecht een actiepunt: de **partner** moet de nieuwe prijs bevestigen, niet de klant. Dat staat al goed in de bestaande `PartnerItemCard` / admin-detail.

Optioneel klein verbeterpunt (als losse vervolgactie, niet nu):
- Wanneer admin een prijs aanpast nádat de klant al akkoord heeft gegeven, een waarschuwing tonen in admin: *"Klant heeft al akkoord gegeven op €X — wil je de klant opnieuw om akkoord vragen of dit intern verwerken?"* met twee knoppen: "Vraag klant opnieuw akkoord" (reset `customer_approved_at`/`customer_accepted_at`) of "Alleen interne correctie" (huidige gedrag).

### 4. Tests

In `src/lib/__tests__/portalPricing.consistency.test.ts` een case toevoegen: item met `customer_accepted_at` gezet + open admin override → klantportaal toont géén actie/banner; admin/partner-zijde toont nog wel het price-change signaal.

## Bestanden

- `src/components/customer-portal/CustomerProgramItem.tsx` — guard toevoegen aan `priceChangeNeedsAttention`
- `src/components/customer-portal/PriceSummaryCard.tsx` — zelfde guard bij summary
- `src/lib/__tests__/portalPricing.consistency.test.ts` — extra testcase

Geen DB-migratie nodig, geen wijziging in `portalPricing.ts` zelf (logica blijft bruikbaar voor admin/partner).