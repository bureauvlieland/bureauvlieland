
## Plan: admin-status rond offertefase corrigeren

### Wat ik heb vastgesteld
- Voor deze aanvraag (`BV-2603-0007`) staat de offerte nog op `offerte_verstuurd`.
- Alle 10 onderdelen hebben nog `skip_partner_notification = true`.
- Geen enkel onderdeel heeft nu `customer_approved_at`, dus de klant heeft nog niets geaccordeerd.
- Ik heb gecontroleerd dat de klantpagina de akkoord-flow nu wel toont op de tab **Programma**:
  - “Ik ben akkoord met alle resterende onderdelen”
  - “Alle resterende akkoord geven”
  - per onderdeel een knop “Akkoord”

Het probleem zit dus niet meer in de klantpagina, maar in de **admin-weergave en admin-logica**.

### Waarom je nu “Nog niet verstuurd” blijft zien
Die tekst wordt nu getoond op basis van alleen:
- `item.status === "pending"`
- `item.skip_partner_notification === true`

Daardoor worden 2 verschillende fases onterecht als hetzelfde behandeld:
1. **Offerte is naar klant gestuurd, maar klant heeft nog niet geaccordeerd**
2. **Klant heeft akkoord gegeven, admin kan nu partners benaderen**

Beide tonen nu “Nog niet verstuurd”, en dat is misleidend.

### Wat ik ga aanpassen
**1. Admin item-status slimmer maken**
In `src/pages/admin/AdminRequestDetail.tsx` vervang ik de simpele label-check door quote-aware logica:

- `offerte_verstuurd` + `skip_partner_notification = true` + geen `customer_approved_at`
  - toon: **“Wacht op klant”** of **“Offerte verstuurd”**
- `akkoord_ontvangen` + `skip_partner_notification = true` + wel `customer_approved_at`
  - toon: **“Klaar om te versturen”**
- `skip_partner_notification = false`
  - toon weer de normale operationele status zoals **Aangevraagd / Bevestigd**

**2. Bovenste admin-banner corrigeren**
De banner in `AdminRequestDetail` toont nu te vroeg:
- “X onderdelen zijn nog niet naar partners verstuurd”

Die splits ik op:
- vóór klantakkoord: **informatiebanner** “Offerte verstuurd — wacht op akkoord van klant”
- na klantakkoord: **actiebanner** “X onderdelen klaar om naar partners te sturen”

De knop **Verstuur naar partners** toon ik alleen als er echt onderdelen klaarstaan om te versturen.

**3. Admin projectenoverzicht corrigeren**
In `src/pages/admin/AdminProjects.tsx` wordt `items_not_sent` nu ook te grof berekend op alleen `skip_partner_notification`.

Dat pas ik aan zodat:
- offerte-items die nog op klantakkoord wachten niet meer als “nog niet verstuurd” tellen
- alleen echt verzendklare onderdelen in die teller komen
- desnoods een aparte status/chip komt voor **“wacht op klant”**

**4. Backend beveiligen tegen te vroeg versturen**
In `supabase/functions/accept-quote-proposal/index.ts` zit nu een fallback:
- als er geen klant-geaccordeerde items zijn, pakt hij alsnog alle `skip_partner_notification = true` items

Dat ga ik aanscherpen:
- admin-verzending stuurt standaard alleen items met `customer_approved_at`
- als er nog niets is geaccordeerd, geeft de functie een nette melding terug en verstuurt niets
- zo voorkom ik dat partners per ongeluk al benaderd worden vóór klantakkoord

### Verwacht resultaat
Na deze wijziging is de flow helder:

```text
Offerte verstuurd naar klant
→ admin ziet: “Wacht op klant”
→ klant geeft akkoord
→ admin ziet: “Klaar om te versturen”
→ admin verstuurt naar partners
→ admin ziet: “Aangevraagd”
```

### Technische details
**Bestanden die ik ga aanpassen**
- `src/pages/admin/AdminRequestDetail.tsx`
- `src/pages/admin/AdminProjects.tsx`
- `supabase/functions/accept-quote-proposal/index.ts`

**Waarschijnlijk extra helper**
- Een kleine gedeelde helper voor quote/send-status, zodat de regels niet dubbel in meerdere componenten komen.

**Geen database-migratie nodig**
- Alle benodigde velden bestaan al:
  - `quote_status`
  - `skip_partner_notification`
  - `customer_approved_at`

### QA die ik daarna doe
Ik test dit met deze concrete aanvraag:
1. offerte verstuurd, nog geen klantakkoord
2. één onderdeel akkoord
3. alles akkoord
4. admin verstuurt naar partners

En ik controleer daarbij:
- de statusbadge per regel
- de banner bovenaan
- de teller in het projectenoverzicht
- dat partners niet te vroeg een aanvraag ontvangen
