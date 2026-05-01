## Wat gaat er mis

In het portaal van **BV-2604-0003** (en vergelijkbare projecten) zie je drie tegenstrijdige signalen:
- Rechts staat **"Programma · Bevestigd (15/15)"** met een groen vinkje.
- Onder elk programmaonderdeel staat een blauwe melding *"De aanbieder is beschikbaar. Klik op 'Akkoord' om deze activiteit definitief te boeken."*
- Maar de groene **Akkoord-knop ontbreekt**.

### Waarom dit ontstaat

Diep in de data zit een inconsistentie:

```
15 onderdelen | status='confirmed' | skip_partner_notification=true | item_quote_status=NULL (op 4 na)
quote_status van het programma: 'offerte_verstuurd'
```

Vertaald: een admin heeft alle items handmatig op `confirmed` gezet **zonder ze ooit naar de partners te versturen** (`skip_partner_notification = true`, `item_quote_status` overwegend leeg). De offerte aan de klant is wél verstuurd. De UI gebruikt drie verschillende regels die nu botsen:

1. **Statustegel rechts** kijkt alleen naar `items.status === 'confirmed'` (`calculateStatusSummary` in `src/types/programRequest.ts`). 15 items zijn `confirmed`, dus → "Bevestigd 15/15" groen. *Dat is misleidend: niemand heeft daadwerkelijk bevestigd.*
2. **Blauwe banner** in `CustomerProgramItem.tsx` toont zodra `status==='confirmed' && !customer_accepted_at && !customer_approved_at` — ongeacht quote-mode, ongeacht of de partner echt akkoord gaf.
3. **Akkoord-knop** zit achter een strikter slot: in quote-mode (en alle projecten draaien nu in quote-mode, zie `isQuoteMode = true` in `DesktopProgramView`/`MobileProgramView`) verschijnt de knop alleen als `isQuoteItemAwaitingCustomerApproval()` true is, en die vereist dat `item_quote_status` op `in_afstemming` of `bevestigd` staat. Voor 11 van de 15 items is dat `NULL`, dus geen knop.

Resultaat: je ziet een "actie vereist"-banner maar er is geen actieknop, en tegelijk schreeuwt de tegel rechts dat alles al bevestigd is.

## Wat we gaan doen

### A. Statustegel niet meer liegen
`calculateStatusSummary` en de "Programma"-tegel in `StatusSummary.tsx` moeten in quote-mode rekening houden met of het onderdeel ook echt door de klant **én** door de partner is geaccordeerd, niet puur met `status='confirmed'`.

Nieuwe definitie van "echt bevestigd" in quote-context:
- `status` in `confirmed` of `alternative`
- **én** `customer_approved_at` gezet (of het hele project staat op `quote_status='akkoord_ontvangen'`/`definitief_bevestigd`)
- **én** ofwel `skip_partner_notification = false` (verstuurd) ofwel `item_quote_status = 'bevestigd'` (partner heeft definitief bevestigd)

We tonen dan correct: *"Wachten op aanbieders (0/15 bevestigd)"* of *"Uw akkoord nodig (0/15)"*, niet "Bevestigd 15/15".

### B. Blauwe banner alleen tonen als er ook echt iets te doen is
In `CustomerProgramItem.tsx` veranderen we `needsCustomerAction` zodat de banner **én** de knop dezelfde voorwaarde delen:
- In quote-mode: banner verschijnt alleen als `isQuoteItemAwaitingCustomerApproval(item)` true is.
- In niet-quote-mode (legacy): huidige logica blijft.

Zo verdwijnt de "klik op Akkoord"-tekst voor items waar er geen knop is.

### C. Datacorruptie aanpakken — items die nooit verstuurd zijn
Veel projecten in de DB hebben `status='confirmed' + skip_partner_notification=true + item_quote_status=NULL`. Dat is logisch onmogelijk: een onderdeel dat nooit aan de partner is voorgelegd kan niet "bevestigd" zijn.

Migratie:
- Voor alle items met `skip_partner_notification = true` en `item_quote_status IS NULL`:
  - reset `status` naar `pending`
- Voor items waar het programma `quote_status='offerte_verstuurd'` is en de items wachten op klantgoedkeuring: zet `item_quote_status = 'in_afstemming'` zodat de Akkoord-knop normaal verschijnt na deze bestaande UI-logica.

### D. Voorkomen dat dit opnieuw gebeurt
Twee guardrails:
1. **DB-trigger** op `program_request_items` die `status='confirmed'` blokkeert wanneer `skip_partner_notification = true` en er geen `item_quote_status` of `customer_approved_at` is.
2. **Edge functie `send-items-to-partners`** moet bij elke succesvolle verzending `skip_partner_notification = false` en `item_quote_status = 'in_afstemming'` zetten (verifiëren of dat al gebeurt; zo niet, toevoegen).

### E. Admin-zichtbaarheid
Op de adminpagina van een project tonen we een waarschuwingsbalkje wanneer er items zijn met `status='confirmed'` maar `skip_partner_notification=true` ("Deze onderdelen zijn nog niet naar partners verstuurd"). Voorkomt dat dit weer onopgemerkt blijft.

## Volgorde van uitvoeren

1. Migratie A+B (data-fix + guardrail-trigger).
2. Frontend `calculateStatusSummary` en `StatusSummary` aanpassen.
3. Frontend `CustomerProgramItem` banner-conditie gelijktrekken met knop.
4. Edge functie `send-items-to-partners` controleren/uitbreiden.
5. Admin waarschuwingsbalk in `AdminRequestDetail`.

## Buiten scope
- Geen wijziging aan partnerportaal of e-mailtemplates.
- Geen aanpassing van het pricing- of facturatiemodel.
