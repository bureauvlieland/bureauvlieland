# Te veel betaalde bedragen terughalen via verrekening

Drie openstaande terugvorderingen worden verrekend met de eerstvolgende factuur van dezelfde partner. Geen nieuwe schermen — alleen deze drie gevallen administratief vastleggen en netjes communiceren.

## Om welke bedragen gaat het

| Partner | Factuur | Betaald | Correct | Terug te halen |
|---|---|---|---|---|
| Isla Vlieland / Trattoria Oliva | 7 | € 822,22 | € 723,75 | € 98,47 |
| Manege De Seeruyter | 202702 | € 595,90 | € 546,70 | € 49,20 |
| Zuiver Traiteur | T-261008 (dubbel betaald) | € 225,00 | € 0,00 | € 225,00 |

Totaal terug te halen: € 372,67.

## Wat er gebeurt

1. **Creditregel per partner vastleggen.** Voor elke partner komt er een negatieve inkoopfactuur (креditregel) met het terug te halen bedrag, gekoppeld aan hetzelfde project als de originele factuur. Zo klopt de inkoopwaarde per project weer en staat de vordering zichtbaar open — zelfde aanpak als eerder bij Brouwerij Fortuna.
2. **Automatische verrekening in de betaalbatch.** Omdat de creditregel een negatief bedrag is, gaat hij mee in de eerstvolgende SEPA-batch van die partner en trekt daar het bedrag van af. Er hoeft dus niets teruggestort te worden.
3. **De originele facturen** blijven op 'betaald' staan; de markering 'terug te vorderen' wordt vervangen door een verwijzing naar de creditregel, zodat de batchgenerator ze niet langer blokkeert.
4. **Mail naar de drie partners** met korte uitleg: welk bedrag, waarom (BTW dubbel gerekend, resp. dubbele registratie) en dat het met de volgende factuur verrekend wordt. Je krijgt de teksten eerst te zien voordat er iets verstuurd wordt.

## Aandachtspunt

Zuiver Traiteur betreft een dubbele registratie van dezelfde factuur — daar is het hele bedrag van € 225,00 onverschuldigd betaald, niet alleen een BTW-verschil. Als die partner in de komende maanden geen nieuwe factuur stuurt, blijft de creditregel open staan en is alsnog een terugstorting nodig; dat zie je dan in Commissie Beheer.

## Technisch

- Nieuwe rijen in `partner_purchase_invoices` met negatief `amount_excl_vat` / `vat_amount` / `amount_incl_vat`, factuurnummer met `C-`-prefix (bijv. `C-7`, `C-202702`, `C-T-261008`), status `forwarded` zodat ze in de volgende batch meelopen.
- Op de originele rijen: `refund_pending_at` leegmaken en `refund_reason` aanvullen met de verwijzing naar de creditregel, zodat `generate-payment-batch` niet meer blokkeert.
- Controle achteraf: som per partner in Commissie Beheer moet gelijk zijn aan het PDF-totaal van de originele facturen.
- De tijdelijke auditfunctie `temp-invoice-pdf-audit` wordt in dezelfde stap verwijderd.
