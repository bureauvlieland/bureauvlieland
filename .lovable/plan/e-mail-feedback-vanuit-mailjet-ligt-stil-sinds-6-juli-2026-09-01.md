# E-mail: feedback vanuit Mailjet ligt stil sinds 6 juli

Je gevoel klopt. Verzenden werkt (1.107 verzonden mails, meest recente vandaag 20:06), maar **terugkoppeling** van Mailjet is dood:

| Signaal | Laatste gebeurtenis |
| --- | --- |
| Afgeleverd (`delivered`) | 6 juli 2026 |
| Geopend | 4 juli 2026 |
| Geklikt | 6 juli 2026 |
| Bounce / spam / afmelding | nooit resp. 28 mei |
| Suppressielijst | **0 rijen** |

Op 8 juli is de webhook beveiligd met een verplicht token (`?token=...`). Vanaf dat moment stoppen alle events. Een testaanroep op de live webhook zonder token geeft nu `401 Unauthorized` — precies wat er met elke Mailjet-post gebeurt. Conclusie: de webhook-URL die in Mailjet staat ingesteld mist het token (of is nooit bijgewerkt na het invoeren van de beveiliging).

Gevolg: geen aflever-, bounce-, spam- of afmeldinformatie meer, suppressielijst blijft leeg, en het Email Health-dashboard toont per definitie niets. Een klant of partner die niet meer bereikbaar is, blijft dus onzichtbaar mails krijgen.

Tweede, kleiner probleem: **24 verzonden mails in de afgelopen 60 dagen hebben geen Mailjet-MessageID**, waardoor ze ook bij een werkende webhook nooit gekoppeld kunnen worden. Consequent bij deze soorten: nieuwe logies-offerte-melding, "factuur geregistreerd", logies geaccepteerd (klant + partner), en deels doorgestuurde inkoopfacturen en projectmails.

## Oplossingen

1. **Webhook weer laten aankomen (jouw actie + hulpmiddel in de app)**
   - In het Email Health-dashboard komt een blok "Webhook-status" met: de volledige, kant-en-klare webhook-URL inclusief token (copy-knop), de laatst ontvangen event-tijd, en een "Test webhook"-knop die een gesimuleerd event door de echte keten stuurt en het resultaat toont.
   - Daarnaast een tolerantere ontvangst: het token mag ook via een header meegegeven worden, zodat elke Mailjet-configuratievariant werkt.
   - Jij zet die URL eenmalig in Mailjet bij alle event-types (sent, open, click, bounce, blocked, spam, unsub).
   - Historische events komen niet terug; Mailjet levert die niet opnieuw. Vanaf het moment van instellen is het weer live.

2. **Stille storing zichtbaar maken (heartbeat-alarm)**
   - Dagelijkse controle: als er >24 uur geen enkel Mailjet-event is binnengekomen terwijl er wél mails zijn verzonden, komt er een taak op de Werkbank en een melding naar `hallo@bureauvlieland.nl`.
   - Zo kan dit nooit weer twee maanden onopgemerkt doorlopen.

3. **Ontbrekende MessageID's dichten**
   - De vier verzendfuncties die structureel geen MessageID opslaan aansluiten op dezelfde uitleesroutine als de rest, plus een monitor in Email Health die per soort toont hoeveel recente mails zonder MessageID staan.

4. **Suppressie-controle valideren**
   - Nu de suppressielijst leeg is, is nooit getest of blokkeren werkt. We voegen een testdekking toe die controleert dat verzending naar een geblokkeerd adres daadwerkelijk wordt geweigerd en gelogd.

## Technische uitvoering

- `supabase/functions/mailjet-event-webhook/index.ts`: token ook accepteren via `x-mailjet-token`-header naast query-param; ongeautoriseerde pogingen loggen met tijdstip, zodat verkeerd geconfigureerde posts zichtbaar worden.
- Nieuwe edge function `mailjet-webhook-selftest`: post een synthetisch event met geldig token naar de webhook en rapporteert de uitkomst; alleen admin-aanroepbaar.
- Nieuwe edge function/cron `email-webhook-heartbeat` (dagelijks): vergelijkt `max(delivered_at, opened_at, clicked_at, bounced_at)` met recente `email_log.sent_at`; bij >24u stilte een admin-todo + notificatiemail.
- `src/pages/admin/AdminEmailHealth.tsx` (of huidige Email Health-pagina): blok met webhook-URL + token (uit een nieuwe admin-only RPC/edge function, nooit in de client-bundle hardcoded), laatste event-tijd, selftest-knop, en tabel "recente sends zonder MessageID per type".
- `extractMessageIds`-aansluiting in: `send-accommodation-quote-notification` (of de functie achter `accommodation_quote_notification`), `register-partner-invoice`, `select-accommodation-quote` (klant- en partnermail), en de resterende paden in `forward-purchase-invoice` en `send-project-email`.
- Tests: unit-test voor de heartbeat-drempel, Deno-test voor de webhook met header-token, en een suppressie-blokkade-test in `_shared/mailjet-send`.
