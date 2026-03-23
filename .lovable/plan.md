

## Plan: Prijsweergave AdminQuotePriceEditor corrigeren

### Probleem

De `AdminQuotePriceEditor` toont de prijzen omgedraaid:
- **Hoofdprijs** (groot, vet): `admin_price_override` (€660,00) — de voorlopige schatting
- **Doorgestreept** (klein, grijs): `quoted_price` (€598,95) — de definitieve partnerprijs

Maar `portalPricing.ts` zegt: `quoted_price` wint altijd van `admin_price_override`. De klantpagina en het financieel overzicht gebruiken correct €598,95. De admin-tabel toont het tegenovergestelde.

### Oorzaak

Regel 50: `displayPrice = overridePrice ?? originalPrice` — behandelt override als "actueel" en quoted als "oud". Maar de semantiek is andersom: zodra een partner een `quoted_price` vastlegt, is dát de definitieve prijs en wordt de admin-schatting irrelevant.

### Oplossing

**`src/components/admin/AdminQuotePriceEditor.tsx`**

De weergavelogica aanpassen zodat de **effectieve** prijs (quoted_price als die bestaat, anders admin_price_override) prominent wordt getoond:

- Hoofdprijs = `quoted_price ?? admin_price_override` (wat daadwerkelijk gefactureerd wordt)
- Secundair (doorgestreept) = als er een `admin_price_override` was én `quoted_price` nu afwijkt, toon de override als "eerdere schatting"
- Kleuraanduiding:
  - Groen als `quoted_price` aanwezig is (definitieve partnerprijs)
  - Amber als alleen `admin_price_override` (schatting)
  - Geen kleur als geen prijs ("Op aanvraag")
- Label: "Partnerprijs" als quoted_price aanwezig, "(schatting)" als alleen override

De popover-editor zelf hoeft niet te veranderen — die bewerkt altijd de `admin_price_override`.

### Bestanden
1. `src/components/admin/AdminQuotePriceEditor.tsx` — weergavelogica omdraaien

