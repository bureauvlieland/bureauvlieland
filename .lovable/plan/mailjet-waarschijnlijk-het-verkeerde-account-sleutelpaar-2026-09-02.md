# Mailjet: waarschijnlijk het verkeerde account/sleutelpaar

Je vermoeden is goed onderbouwd door de meting van vandaag.

Afgelopen 7 dagen kwamen er **327 events** binnen op onze webhook. Daarvan is er **0 gekoppeld** aan een verzending van Bureau Vlieland. De ontvangers horen bij fietsverhuur-domeinen (fietsverhuur-ameland.nl, jandejongefietsen.nl, schierfiets.nl, fietsenopschier.nl, abelsbikes.nl) plus consumentenadressen — het verkeer van je andere project.

Conclusie die dit ondersteunt: de webhook is geregistreerd op het Mailjet-account van het **andere** project (het sleutelpaar dat in het PowerShell-script is gebruikt), terwijl Bureau Vlieland via een ander account/subaccount verstuurt — of andersom. Zolang verzenden en webhook niet op hetzelfde account staan, blijft de terugkoppeling (afgeleverd/geopend/bounce) per definitie leeg.

Nog niet zeker: welke van de twee kanten fout staat. Dat wordt stap 1.

## Aanpak

1. **Vaststellen welk account welke rol heeft** (geen wijziging, alleen meten)
   - Via Admin > E-mail gezondheid, knop "Verzendaccount controleren": die laat zien welke afzenders op het account staan waar onze API-sleutel bij hoort, welke webhooks daar geregistreerd staan, en of onze laatste MessageID's op dat account bekend zijn.
   - Zie je daar fietsverhuur-afzenders staan, dan zit het verkeerde sleutelpaar in de app-secrets. Zie je bureauvlieland-afzenders maar geen webhook, dan is alleen de webhookregistratie op het verkeerde account gezet.

2. **Correctie, afhankelijk van de uitkomst**
   - *Verkeerde sleutels in de app*: jij levert het juiste API-sleutelpaar van het Bureau Vlieland-account aan; ik zet die als secrets en herstart de verzendfuncties. Daarna webhook opnieuw registreren op dát account.
   - *Alleen webhook fout geregistreerd*: het PowerShell-script opnieuw draaien met de sleutels van het Bureau Vlieland-account, en de registratie op het andere account weghalen zodat wij niet langer hun verkeer binnenkrijgen.

3. **Vervuiling stoppen en zichtbaar maken**
   - Zolang vreemd verkeer binnenkomt: events waarvan de ontvanger niet in onze eigen verzendlog voorkomt, apart markeren als "vreemd account" in plaats van als "niet gekoppeld". Zo vertekent het de matchratio niet meer.
   - De zelftest laat de matchratio-controle pas alarmeren op ónze eigen events, en slaat alarm als er 24 uur lang wél verzonden maar niets teruggekoppeld is.

4. **Bewijs achteraf**
   - Proefmail versturen via dezelfde knop, openen, en controleren dat "afgeleverd" en "geopend" binnen enkele minuten verschijnen. Pas dan is de keten aantoonbaar rond.

## Technische uitvoering

- Diagnose met bestaande `mailjet-webhook-status` acties `trace` en `probe` (geen nieuwe code nodig voor stap 1).
- `mailjet-event-webhook`: extra classificatie `foreign_account` in `match_reason` wanneer het ontvangeradres in geen enkele `email_log`-regel voorkomt; deze rijen buiten de matchratio houden.
- `critical-selftest`: `webhook_match_ratio` berekenen over events exclusief `foreign_account`.
- `WebhookStatusCard.tsx`: aparte teller "events van ander account" naast "niet gekoppeld", zodat de oorzaak in één oogopslag zichtbaar is.
- Secrets: eventueel `MAILJET_API_KEY` / `MAILJET_SECRET_KEY` vervangen (alleen na jouw aanlevering), gevolgd door herdeploy van de verzendfuncties.
