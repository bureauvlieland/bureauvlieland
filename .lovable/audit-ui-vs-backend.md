# Audit: belofte in de interface vs. werkelijkheid in de backend

Peildatum: 2026-09-02. Alle cijfers zijn gemeten op de live database, niet geschat.

## Meting van vandaag

| Meting | Uitkomst |
| --- | --- |
| Webhook-events laatste 24 uur | 157–163 ontvangen, **0 gekoppeld** aan een eigen verzending |
| Verzendingen laatste 24 uur | 20, allemaal status `sent`, **0 afgeleverd/geopend** teruggemeld |
| Blokkadelijst (`email_suppressions`) | 0 rijen (nog geen bounce/klacht binnengekomen) |
| Inhoud bewaard (7 dagen, verzonden) | 34 van 34 — opslag van de body werkt nu wél |
| MessageID's bekend op Mailjet-account | 1 van 3 gecontroleerde recente verzendingen |

## Bevestigde oorzaak van de blinde terugkoppeling

Twee van de drie recente MessageID's zijn **onbekend op het Mailjet-account**: precies de ID's
die afgerond zijn opgeslagen (`…306200`, `…870000`). De verzendfuncties die zelf naar de
Mailjet-API posten lazen de ID uit `res.json()` en verloren daarmee de laatste cijfers van het
64-bits getal. Een afgeronde ID bestaat niet: noch de Mailjet-API, noch een webhook-event kan
er ooit op matchen. De ID's van het helper-pad (`sendMailjet`) zijn wél exact en wél bekend.

Actie: alle 52 verzendfuncties opnieuw uitgerold op de gedeelde code die de ID uit de ruwe
respons haalt. Vanaf nu horen nieuwe verzendingen exacte ID's te krijgen; de zelftest meet dat
dagelijks (`mailjet_account_match`).

Openstaand punt voor Erwin: de events die binnenkomen horen bij **andere afzenders**
(`reserveren@fietsverhuur-ameland.nl`, `info@fietsenopschier.nl`, `verhuur@abelsbikes.nl` en
particuliere ontvangers). Dat betekent dat het Mailjet-account waarop de webhook staat ook door
andere verzenders gebruikt wordt. De knop **Verzendaccount controleren** op Admin → E-mail
gezondheid laat zien welke afzenders en webhooks daar geregistreerd staan.

## Wat er is dichtgezet

| Belofte in de interface | Was | Nu |
| --- | --- | --- |
| "Opnieuw versturen" stuurt hetzelfde bericht | Reconstrueerde een benaderende tekst als de inhoud ontbrak | Weigert met uitleg (HTTP 409, `body_missing`) |
| Kolommen Afgeleverd/Geopend | Altijd 0, ook zonder meting | Match-ratio, niet-gematchte ontvangers en alarm bij 0% match op de webhookkaart |
| Blokkadelijst beschermt verzending | Alleen in het helper-pad | Fetch-interceptor blokkeert op **elk** verzendpad; dagelijkse dry-run-check |
| Geplande taken "succeeded" | Alleen "verzoek verstuurd" | Echte HTTP-uitkomst per taak + watchdog met alarm |
| Inhoud van verstuurde mail | 1.201 van 1.303 zonder inhoud | Alle verzendingen van de laatste 7 dagen met inhoud; dagelijkse check |

## Dagelijkse zelftest (13 checks)

Naast de bestaande publieke paden meet `critical-selftest` nu ook:

- `webhook_match_ratio` — events binnen maar 0 gekoppeld = melding;
- `mailjet_account_match` — zijn onze MessageID's bekend op het verzendaccount;
- `suppression_enforced` — is de blokkadecheck uitvoerbaar (dry-run, verstuurt niets);
- `email_body_storage` — logt een verzendpad zonder bewaarde inhoud.

Faalt een check, dan volgt één alertmail per 12 uur plus een Werkbank-taak met hoge prioriteit.

## Nog open (fase 3)

- Financiële kruiscontrole: commissie-werklijst vs. concept-factuurregels automatisch vergelijken
  en verschillen melden in plaats van ze te ontdekken.
- Bounce-test met een echt testadres zodat de blokkadelijst zich aantoonbaar vult.
