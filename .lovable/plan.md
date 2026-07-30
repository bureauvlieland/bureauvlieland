## Wat er misging bij BV-2606-0017

Twee losse fouten, beide bevestigd in de code en de data:

1. **De mails gingen al weg vóórdat u iets koos.** De admin-annulering roept `cancel-program-request` aan; die functie roept intern zélf `notify-partner-cancellation` aan voor álle partners (regel 281–304). Pas daarna opent de UI het keuzevenster. Uw keuze in de popup kwam dus altijd te laat — die verstuurt een tweede ronde mails.
2. **Partners waren nog nooit benaderd.** Alle 7 onderdelen van BV-2606-0017 staan op `skip_partner_notification = true` en hebben geen `quoted_at`: er is nooit een beschikbaarheids-/prijsaanvraag naar de partner gegaan. Toch kregen Neptunus, Café Boven, Zuiver en Vliehors Expres een annuleringsmelding. `notify-partner-cancellation` filtert alleen op `block_type` en bureau-items, niet op "is deze partner ooit benaderd".

## Wat ik ga doen

### 1. Auto-versturen loskoppelen van de admin-annulering
`cancel-program-request` krijgt een parameter `notify_partners` (default `true`, zodat de klant-annulering in het klantportaal onveranderd blijft werken). De admin-flow in `AdminRequestDetail.tsx` stuurt `notify_partners: false` mee. Resultaat: bij annuleren door de admin gaat er niets uit tot u in de popup op "Verstuur annuleringsmails" klikt. Klikt u op "Niet nu versturen" of sluit u het venster, dan gaat er niets.

### 2. Alleen benaderde partners mailen
Nieuwe gedeelde helper `supabase/functions/_shared/partnerWasApproached.ts` met één regel: een partner is benaderd als het onderdeel `skip_partner_notification = false` heeft óf de partner al gereageerd heeft (`quoted_at`, `partner_price_change_acknowledged_at`, of `item_quote_status` in de partner-statussen).

Die filter komt op drie plekken:
- `notify-partner-cancellation`: onbenaderde partners worden overgeslagen, ook als hun `partner_id` expliciet in `partner_ids` staat — zo kan het nooit meer per ongeluk.
- `cancel-program-request`: de teruggegeven `affected_activity_partners` bevat alleen benaderde partners.
- `AdminRequestDetail.tsx` (de "achteraf alsnog informeren"-knop): dezelfde filter bij het opbouwen van de lijst.

Voor logiespartners geldt dit al impliciet — daar is een quote-record hét bewijs dat de partner benaderd is — dus die logica blijft ongewijzigd.

### 3. Popup duidelijker maken
`PartnerCancellationNotifyDialog` toont per activiteitenpartner een statuslabel ("Offerte-aanvraag verstuurd" / "Prijs bevestigd"), zodat u ziet waaróm iemand in de lijst staat. Zijn er na de filter geen partners over, dan opent de popup niet meer en ziet u de melding "Geen partners zijn benaderd — er hoeft niemand geïnformeerd te worden".

### 4. Borging
- Contract-test dat `cancel-program-request` bij `notify_partners: false` geen `notify-partner-cancellation` aanroept.
- Unit-tests op de nieuwe helper (skip=true + geen reactie → niet benaderd; skip=false → benaderd; skip=true maar `quoted_at` gezet → wél benaderd).
- Uitbreiding van de bestaande idempotency-test zodat een expliciet meegegeven maar onbenaderde `partner_id` genegeerd wordt.

## Wat ik niet aanpas
De al verstuurde mails voor BV-2606-0017 kan ik niet terughalen. De communicatie-log blijft staan zoals hij is; ik verwijder geen historie.
