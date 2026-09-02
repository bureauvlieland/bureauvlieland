# Code-review: zekerheid over mail, geld en wat de interface belooft

Je punt is terecht. Ik heb eerst gemeten in plaats van geraden. Dit is wat nu al aantoonbaar is, plus een aanpak om de rest van dezelfde soort fouten systematisch op te sporen.

## Wat ik nu al heb vastgesteld

1. **Rapportage zonder bron (dezelfde fout als bij Opens).**
   In de laatste 30 dagen: 120 gelogde mails, waarvan **0 met afleverbevestiging, 0 opens, 0 kliks, 0 bounces**. De kolommen bestaan en worden getoond, maar er komt (nog) geen bruikbare terugkoppeling in. De open-tracking is gisteren aangezet, maar `delivered` en `bounce` zijn nog steeds leeg — dat is niet opgelost door de pixel.

2. **De suppressielijst is leeg (0 rijen).**
   De app presenteert bescherming tegen verzenden naar geblokkeerde adressen, maar die lijst is nooit gevuld. Er is dus geen enkel bewijs dat die bescherming ooit heeft gewerkt.

3. **Dubbele geplande taak — risico op dubbele herinneringen.**
   `check-pending-items` staat **twee keer** ingeschakeld: dagelijks om 08:00 en om 09:00. Beide lopen elke dag. Elke partner-herinnering die deze taak stuurt, kan dus dubbel de deur uit gaan.

4. **Geplande taken worden niet echt gecontroleerd.**
   De planner meldt "succeeded" zodra het verzoek is *verstuurd*, niet als de functie is *geslaagd*. In de afgelopen dagen staat er één verzoek zonder antwoordcode (mislukt) zonder dat iemand dat kon zien. Er is geen enkel alarm als een dagelijkse taak stilvalt — precies het scenario "ik denk dat het verstuurd is".

5. **"Opnieuw versturen" is grotendeels schijn.**
   Van 1.302 gelogde mails hebben er **101** de echte inhoud opgeslagen. Bij de rest wordt bij opnieuw versturen een gereconstrueerde of vervangende tekst gestuurd, terwijl de knop hetzelfde oogt.

## Aanpak

### Fase 1 — Volledige inventarisatie "belofte vs. werkelijkheid" (eerst opleveren als rapport)

Elke plek in de admin die een getal, status of garantie toont, wordt afgelopen en gekoppeld aan de bron die het getal produceert. Per item één van drie uitkomsten: **werkt**, **leeg/dood** (geen schrijvende functie, geen recente data), of **misleidend** (toont iets anders dan de bron betekent). Speciale aandacht voor:
- alle e-mailstatistieken en -garanties (verzonden, afgeleverd, geopend, geblokkeerd, herinneringen, heartbeat);
- alle financiële totalen (commissie, inkoopfacturen, betaalbatches, verkoopfacturen, BTW), inclusief of twee plekken hetzelfde bedrag altijd gelijk berekenen;
- alle dagelijkse automatiseringen: draait de taak, sluit hij af, en wat gebeurt er bij een fout;
- knoppen en acties die stil kunnen falen (geen foutmelding, wel succes-toast).

Je krijgt dit als één overzicht met prioriteit, niet als losse berichten.

### Fase 2 — De vijf bevestigde problemen dichten
- Dubbele `check-pending-items` uitschakelen en een regel toevoegen die dubbele geplande taken onmogelijk maakt.
- Alle geplande taken schrijven een uitkomst weg (gelukt/mislukt, aantallen). Blijft een taak weg of faalt hij, dan komt er een taak op de Werkbank én een mail — geen stilte meer.
- Afleverstatus en bounces daadwerkelijk laten aankomen en koppelen; zolang er voor een verzending geen terugkoppeling is, toont de interface expliciet "geen terugkoppeling" in plaats van een 0.
- Suppressie krijgt een aantoonbare werking: bounces en klachten vullen de lijst, verzending naar zo'n adres wordt geweigerd en gelogd, en dat wordt door een test afgedwongen.
- Elke verzending slaat de echte inhoud op; "opnieuw versturen" is uitgeschakeld (met uitleg) als de originele inhoud ontbreekt.

### Fase 3 — Zekerheid die blijft werken
- Eén regel voor de hele app: een getal of statuslabel mag alleen zichtbaar zijn als de bron aantoonbaar gevuld wordt. Anders "nog niet gemeten".
- Een dagelijkse controle die de bedrijfskritische ketens end-to-end doorloopt (aanvraag → mail → log → terugkoppeling, en factuur → bedragen → batch) en bij afwijking meteen alarm slaat.
- Financiële dubbelcontrole: dezelfde bedragen op twee plekken worden geautomatiseerd vergeleken; verschillen worden gemeld in plaats van dat jij ze ontdekt.

## Technische uitvoering

- Cron: `cron.unschedule` van de dubbele `check-pending-items` (jobid 1 of 2); alle jobs herschrijven naar een wrapper die na afloop in een `job_run_outcome`-tabel schrijft; nieuwe functie `cron-watchdog` (dagelijks) die ontbrekende of mislukte runs omzet in een admin-todo + mail.
- E-mail: `mailjet-event-webhook` uitbreiden met `sent`/`delivered`/`bounce`/`blocked`/`spam`-verwerking op string-MessageID; `email_suppressions` vullen vanuit bounce/spam-events; blokkade-check in `_shared/mailjet-send.ts` met Deno-test die verzending naar een geblokkeerd adres afwijst.
- `_shared/email-logger.ts`: body-opslag verplicht maken (validatie zoals bij `template_name`), zodat nieuwe verzendpaden niet meer zonder inhoud kunnen loggen; `resend-email` weigert rijen zonder originele inhoud.
- UI: `AdminEmailHealth.tsx` en de dashboards krijgen "geen data"-toestanden gescheiden van "nul"; de audit uit fase 1 wordt vastgelegd in `.lovable/audit-ui-vs-backend.md`.
- Tests: uitbreiding van `tests/edge-function-contracts.test.ts` met een guard die controleert dat elke geplande functie een uitkomst logt, plus vergelijkingstests voor de financiële berekeningen op twee plekken.
