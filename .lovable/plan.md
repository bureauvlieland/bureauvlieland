## Probleem

Bij "Kosten toevoegen" in een lopend project verschijnt de melding **"Fout bij toevoegen kosten"**. 

De insert in `AdminAddCostSheet.tsx` zet:
- `status: 'confirmed'`
- `skip_partner_notification: true`
- `block_type: 'bureau'`

De databasetrigger `guard_item_status_consistency` blokkeert dit, omdat hij eist dat een item alleen op `confirmed` mag staan als het ofwel naar een partner is verstuurd, ofwel door de klant is goedgekeurd, ofwel `item_quote_status = 'bevestigd'` heeft.

Voor losse bureau-kosten (uren, toeristenbelasting, materiaalhuur, etc.) is dat traject niet relevant — er ís geen partner en geen offertetraject.

## Oplossing

**Migratie:** trigger `guard_item_status_consistency` aanpassen zodat items met `block_type = 'bureau'` (interne bureau-kosten) worden uitgezonderd van de check. Voor alle andere items blijft de bescherming intact.

```sql
-- Pseudocode wijziging in de trigger:
IF NEW.block_type <> 'bureau'
   AND NEW.status IN ('confirmed','alternative')
   AND COALESCE(NEW.skip_partner_notification,false) = true
   AND NEW.customer_approved_at IS NULL
   AND COALESCE(NEW.item_quote_status,'') <> 'bevestigd'
THEN RAISE EXCEPTION ...
```

## Resultaat

- Admin kan losse kosten direct opvoeren zonder dat ze door het partner-/klantakkoord-traject hoeven.
- Bestaande beveiliging tegen voortijdig "confirmed" zetten van échte partner-bouwstenen blijft volledig actief.

Geen front-end wijzigingen nodig.