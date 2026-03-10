

## Verbetering admin logiesaanvraag detailpagina

### 1. Layout verbetering (desktop)

De huidige pagina is een 2/3 + 1/3 grid maar de main column is erg lang door de opeenvolging van grote cards. Verbeteringen:

| Wijziging | Detail |
|---|---|
| **Compactere aanvraagdetails** | Verplaats contactgegevens, status-beheer en tijdlijn naar een sticky sidebar. De aanvraagkaart wordt compacter met alle info inline. |
| **Quotes als kaarten i.p.v. tabel** | Op desktop werkt een tabel met 8 kolommen krap. Vervang door compact quote-cards in een grid (2 kolommen) met status-badge, prijs, partner, en actieknoppen. |
| **Samenvattingsstrip bovenaan** | Voeg een compacte stats-strip toe boven de content: "X partners benaderd · Y offertes ontvangen · Z afgewezen · status: In behandeling" — geeft direct overzicht. |
| **Communicatielog** | Verplaats naar een tab of collapsible section onderaan zodat het niet de hele pagina domineert bij veel berichten. |

### 2. "Status-email naar klant" functionaliteit

Nieuwe feature: een knop "Mail klant" in de sidebar die een email genereert op basis van de huidige quote-statussen.

| Component | Detail |
|---|---|
| **Knop in sidebar** | "Mail klant over status" knop onder contactgegevens |
| **Auto-gegenereerde tekst** | Op basis van quotes data: hoeveel partners benaderd, hoeveel offertes ontvangen, hoeveel afgewezen, hoeveel nog wachtend. Voorbeeld: "Beste [naam], hierbij een update over uw logiesaanvraag [REF]. Wij hebben [X] logiespartners benaderd. Van [Y] partner(s) hebben wij een offerte ontvangen, [Z] partner(s) heeft/hebben de aanvraag helaas afgewezen. Wij wachten nog op een reactie van [W] partner(s)..." |
| **Bewerkbare tekst** | Admin kan de gegenereerde tekst aanpassen voordat deze wordt verstuurd |
| **Versturen** | Via bestaande `send-project-email` edge function (al werkend met Mailjet, email logging, en project communications) |
| **Logging** | Automatisch gelogd bij de aanvraag via `project_communications` tabel (bestaande functionaliteit in de edge function) + `email_log` |

### Bestanden

| Bestand | Wijziging |
|---|---|
| `src/pages/admin/AdminAccommodationDetail.tsx` | Herschrijven layout: compactere stats-strip, quote-cards i.p.v. tabel, sticky sidebar, "Mail klant" knop met auto-gegenereerde statustekst die `SendProjectEmailSheet` opent met pre-filled subject+body |

Geen nieuwe edge functions of database wijzigingen nodig — `send-project-email` ondersteunt al `accommodationId` en logt automatisch in `email_log` en `project_communications`.

