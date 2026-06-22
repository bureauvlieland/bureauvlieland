## Wat ik ga doen

### 1. Factuur -002 verwijderen (jij kijkt eerst in UI)
- Eerst open jij in `/admin/facturatie` de PDF-download-knop voor `FV-BV-2605-0001-002` (die heb ik in de vorige iteratie toegevoegd) om met eigen ogen te bevestigen dat daar inderdaad € 1.932,15 op staat i.p.v. € 407,40.
- Zodra je groen licht geeft verwijder ik de rij `bureau_invoices` voor -002 volledig (hard delete via `supabase--insert`), plus eventueel het PDF-bestand in storage (bucket `bureau-invoices`).
- Ik log de verwijdering in `program_request_history` zodat het dossier traceerbaar blijft ("Factuur -002 verwijderd: bedrag was onjuist (projecttotaal i.p.v. restbedrag). Klant wordt opnieuw gefactureerd.").
- Door de trigger `recalculate_program_completion_status` op `bureau_invoices` springt het project automatisch terug van `fully_invoiced` naar `partially_invoiced`, en verschijnt het project weer in het facturatie-overzicht met openstaand bedrag € 407,40. Jij maakt dan handmatig de nieuwe factuur -002 aan (delta € 407,40 incl.) en stuurt 'm naar de klant met de mededeling dat de eerder verzonden -002 onjuist was.

### 2. Komt dit niet meer voor? — zo zorg ik daarvoor
De oorzaak zit in `RegisterBureauInvoiceDialog`: de prefill kan ontsporen als het Financieel-Overzicht (en dus `suggestedAmount` = openstaand) op het moment van openen al up-to-date was, maar er onderweg iets gewijzigd is, of als de gebruiker op enig moment het bedrag handmatig aanpaste naar het projecttotaal. Er zit nu géén harde grens of waarschuwing in. Ik bouw drie zekerheden in:

1. **Prominente weergave van "Openstaand op project"** bovenaan de dialog (groot, met euroteken) — niet alleen als ronde info onder de invoerveldjes. Zo zie je in één oogopslag of de invoer overeenkomt met wat er nog te factureren is.
2. **Waarschuwing + bevestiging** als `totaal incl. BTW > openstaand bedrag`: rode banner *"Let op: dit bedrag (€ X) is hoger dan het openstaand bedrag (€ Y). Weet je zeker dat dit klopt?"* met expliciete checkbox die je moet aanvinken vóór je kunt opslaan. Voor type `credit` en `final` blijft dit een waarschuwing (niet blokkerend), voor `partial` is het standaard blokkerend.
3. **Submit-bevestiging**: een korte confirm-stap *"Je staat op het punt € X incl. BTW te registreren als factuur {nummer}. Doorgaan?"* — voorkomt per ongeluk submitten met een verkeerd ingevuld bedrag.

Daarnaast laat ik de prefill onveranderd (die is wiskundig correct), maar voeg ik een veiligheidstest toe: bij `partial` mag het opgegeven `amount_incl_vat` niet groter zijn dan `outstanding * 1.001` (kleine afrondingsmarge) — anders verschijnt de blokkerende waarschuwing.

### Technische details
- Verwijderfactuur: `DELETE FROM bureau_invoices WHERE id = '<uuid -002>'` + history insert + storage remove.
- Dialog-aanpassingen in `src/components/admin/RegisterBureauInvoiceDialog.tsx`; nieuwe prop `outstandingAmount` vanuit `AdminInvoicing.tsx` (waarde = `calculateInvoiceTotals(selectedRequest).outstanding`).
- Geen schema-wijzigingen.

### Wat ik NIET doe (tenzij je dat wil)
- Geen creditnota meer (was alternatief plan; jij koos voor hard verwijderen + nieuwe -002).
- Geen wijziging aan Snelstart-doorzending; -002 staat nog op `pending` dus is daar nooit aangekomen.