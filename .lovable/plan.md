## Plan — Terminologie in maatwerk-offertemail aanpassen

De standaard e-mailtekst in het "Offerte versturen"-dialoog gebruikt "akkoord geven", laat onvermeld dat prijzen op onderdelen nog voorlopig zijn, én dat de uitvragen naar partners pas ná goedkeuring worden uitgezet. Dit sluit niet aan bij de klantportal, waar consequent van **goedkeuren** wordt gesproken.

### Nieuwe intro-tekst (default)

```
Beste {klantnaam},

Hierbij ontvangt u ons maatwerkvoorstel voor uw evenement op Vlieland.
Wij hebben dit programma speciaal voor {bedrijf} samengesteld.

Programmadetails:
- Data: {data}
- Aantal personen: {aantal}
- Geldig tot: {geldigTot}

U kunt het programma bekijken en goedkeuren via onderstaande knop.
Uiteraard kunnen we onderdelen en tijden vooraf nog aanpassen.

Let op: de prijzen op onderdeelniveau zijn voorlopig. De onderdelen
staan onder voorbehoud van beschikbaarheid en worden voorlopig
voor u genoteerd. Zodra u het programma heeft goedgekeurd, zetten
wij de uitvragen richting onze partners uit, bevestigen we de
reservering en worden de definitieve prijzen bekend.

Heeft u vragen? Neem contact op via hallo@bureauvlieland.nl of 0562 700 208.

Met vriendelijke groet,
Erwin Soolsma
Bureau Vlieland
```

### Wijzigingen

| Bestand | Wat |
|---|---|
| `src/components/admin/AdminSendQuoteDialog.tsx` (`getDefaultIntro`, regel 73-94) | "akkoord geven" → "goedkeuren"; nieuwe alinea over voorlopige prijzen + voorbehoud beschikbaarheid + uitvragen naar partners na goedkeuring |
| `src/pages/admin/AdminQuotePreview.tsx` (regel 569, `plainText` fallback) | Zelfde tekst gelijkgetrokken, zodat de fallback in de preview-flow synchroon loopt |

Geen wijzigingen aan de edge function (`send-quote-offer`) of aan opgeslagen templates — u bewerkt de tekst nog steeds per verzending, dit past alleen de default aan.

### Buiten scope
- Wijzigingen aan bestaande projecten waar deze mail al is verstuurd.
- Terminologie in andere e-mail templates (klantportal-mails, partner-uitvragen).
