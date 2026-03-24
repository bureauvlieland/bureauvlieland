

## Plan: Partner-antwoorden automatisch in het dossier laten landen

### Probleem
De `send-customer-accommodation-message` edge function stuurt mails naar partners met `Reply-To: hallo@bureauvlieland.nl`. Wanneer de partner op "beantwoorden" drukt, belandt het antwoord in de algemene inbox — niet in het inbound-email systeem dat al is ingericht voor automatische dossiervorming.

### Oorzaak
Regel 142: `const replyToEmail = isCentralBilling ? "hallo@bureauvlieland.nl" : programRequest.customer_email;`

Het systeem heeft al een werkende `inbound-email` edge function die mails naar `reply+BV-XXXX-XXXX@bureauvlieland.nl` herkent en automatisch logt als communicatie + admin-todo aanmaakt. Maar deze wordt niet gebruikt in de klant-naar-partner flow.

### Oplossing

**`supabase/functions/send-customer-accommodation-message/index.ts`**

1. Haal het `reference_number` op van de `program_request` (al beschikbaar, hoeft alleen aan de select toegevoegd te worden)
2. Wijzig de `Reply-To` van `hallo@bureauvlieland.nl` naar `reply+{reference_number}@bureauvlieland.nl`
3. Dit geldt voor **beide** modes (bureau_central én partner_direct) — alle antwoorden moeten in het dossier

Concrete wijziging:
- Select uitbreiden: `reference_number` toevoegen aan de program_requests query
- Reply-To aanpassen: `reply+${programRequest.reference_number}@bureauvlieland.nl`
- Reply-To naam blijft: `Bureau Vlieland` (bureau_central) of klantnaam (partner_direct)

### Resultaat
- Partner drukt op "beantwoorden" → mail gaat naar `reply+BV-2503-0012@bureauvlieland.nl`
- `inbound-email` edge function vangt dit op → logt in communicatiedossier + maakt admin-todo
- Geen handmatige actie meer nodig om partnerantwoorden bij te houden

### Bestanden
1. `supabase/functions/send-customer-accommodation-message/index.ts` — Reply-To aanpassen

