# De rest: fase 1 en fase 3 afmaken (plus één nieuw bevestigd gat)

Fase 2 is grotendeels gedaan (dubbele taak weg, uitkomst-logging + watchdog live, precisie-veilige MessageID's, suppressie-blokkade op elk verzendpad). Wat nu overblijft, plus wat ik vanmorgen gemeten heb.

## Wat ik net heb vastgesteld

1. **Terugkoppeling komt binnen, maar landt nergens.** Mailjet stuurt weer events (171 events in 2 dagen, allemaal geautoriseerd, laatste om 05:43 vanmorgen). Toch is in de logs van de webhook **elk** event "No email_log row for MessageID=…". Gevolg: laatste afleverbevestiging is nog steeds 6 juli, laatste open 4 juli, en de laatste 30 dagen (121 mails) staan op 0 afgeleverd / 0 opens / 0 bounces. De oorzaak is nog **niet** vastgesteld: het kan zijn dat dit events zijn van ander verkeer op hetzelfde Mailjet-account, of dat onze eigen verzend-ID's alsnog anders opgeslagen worden. Dat is precies het probleem: niet-gematchte events worden weggegooid zonder spoor (alleen een console-regel), dus het is nu niet na te trekken.
2. **Suppressielijst is nog altijd leeg (0 rijen).** De blokkade is gebouwd en getest, maar er is geen enkel bewijs uit de praktijk — logisch, want er komt geen bounce/spam-event binnen (punt 1).
3. **Inhoud van bijna alle mail is niet bewaard**: 1.201 van 1.303 gelogde mails hebben geen opgeslagen HTML/tekst; in de laatste 30 dagen 19 van 121. "Opnieuw versturen" reconstrueert dan een benadering.

## Aanpak

### Stap 1 — Terugkoppeling écht sluitend maken (eerst)
- Elk binnengekomen event wordt opgeslagen, ook als het niet matcht: ontvanger, type, MessageID, tijd, reden van niet-matchen. Daarmee is binnen een dag hard aan te wijzen of dit vreemd verkeer is of onze eigen mail.
- Op basis van die vastlegging de koppeling repareren (ID-formaat, of matchen op ontvanger + tijdvenster) en één verzending end-to-end aantoonbaar volgen: verzonden → afgeleverd → geopend.
- Zolang een verzending geen terugkoppeling heeft, toont de interface expliciet "geen terugkoppeling" in plaats van een 0. Geen kolom meer die een meting suggereert die er niet is.
- De webhook-kaart krijgt een alarm als er wél events binnenkomen maar 0% matcht — dat is nu de stille faalmodus.

### Stap 2 — Suppressie en inhoud aantoonbaar maken
- Een gecontroleerde bounce-test (via een testadres) zodat de suppressielijst zich vult, verzending naar dat adres wordt geweigerd én dat in de log terugkomt.
- Inhoud opslaan wordt verplicht op elk verzendpad; "opnieuw versturen" is uitgeschakeld met uitleg als het origineel ontbreekt, in plaats van een reconstructie te sturen.

### Stap 3 — Fase 1: inventarisatie "belofte vs. werkelijkheid" (het rapport)
Elk getal, elke status en elke garantie in de admin wordt langsgelopen en gekoppeld aan de bron die het produceert. Per item één uitkomst: **werkt**, **leeg/dood**, of **misleidend**. Nadruk op:
- e-mailstatistieken en -garanties (verzonden, afgeleverd, geopend, geblokkeerd, herinneringen, heartbeat);
- financiële totalen (commissie, inkoopfacturen, betaalbatches, verkoopfacturen, BTW) inclusief of twee plekken hetzelfde bedrag gelijk berekenen;
- dagelijkse automatiseringen: draait de taak, sluit hij af, wat gebeurt er bij een fout;
- knoppen die stil kunnen falen (geen foutmelding, wel succes-melding).

Je krijgt dit als één overzicht met prioriteit. Bevindingen die klein en zeker zijn, fix ik direct mee; de rest komt als lijst met voorstel.

### Stap 4 — Fase 3: zekerheid die blijft werken
- Vaste regel voor de hele app: een getal of statuslabel mag alleen zichtbaar zijn als de bron aantoonbaar gevuld wordt, anders "nog niet gemeten".
- De dagelijkse zelftest uitbreiden met de ketens die nu buiten beeld vallen: mail → log → terugkoppeling, en factuur → bedragen → betaalbatch. Afwijking = taak op de Werkbank + mail.
- Financiële dubbelcontrole: dezelfde bedragen op twee plekken automatisch vergelijken en verschillen melden.

## Technische uitvoering

- Nieuwe tabel `email_webhook_events` (alle events, gematcht of niet, met `match_reason`), gevuld in `mailjet-event-webhook` vóór de matchpoging; RLS admin-only + service_role grants.
- Webhook: matchtelling per aanroep wegschrijven; `cron-watchdog` / `WebhookStatusCard` slaat alarm bij events > 0 en matches = 0 over 24 uur.
- `email_log`: onderscheid "geen event ontvangen" vs. "0" in `AdminEmailHealth.tsx` en de dashboards (nieuwe afgeleide status `feedback_unknown`).
- `_shared/email-logger.ts`: body-opslag verplicht (zelfde validatiepad als `template_name`); `resend-email` weigert rijen zonder origineel in plaats van te renderen (regel 69 e.v.).
- Zelftest (`critical-selftest`) uitbreiden met checks: webhook-matchratio, suppressie-blokkade (dry-run), en financiële kruiscontrole commissie vs. concept-factuurregels.
- Auditrapport vastleggen in `.lovable/audit-ui-vs-backend.md`; testuitbreiding in `tests/edge-function-contracts.test.ts` (elke geplande functie logt een uitkomst) en vergelijkingstests voor de financiële berekeningen.
