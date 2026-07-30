## Wat er misgaat

De mail aan de bezoeker komt uit het database-template `chat_reply_visitor`. Dat template gebruikt de placeholders `{{message_preview}}` (in het grijze blokje) en `{{chat_url}}` (de href van de knop "Open de chat").

De edge function `notify-new-chat-reply` geeft echter alleen `visitor_name` en `portal_link` mee. Gevolg, exact zoals in je screenshot:
- het blokje met het antwoord blijft leeg;
- de knop krijgt `href=""` en is dus niet aanklikbaar.

Daarbovenop: jouw testgesprek heeft `source = 'presales'` (floating button op de site). Voor die bron heeft de function geen link-logica, dus zelfs mét de juiste variabele zou de knop alleen naar de homepage wijzen — een pre-sales bezoeker heeft geen portaal om in te antwoorden.

## Wat ik ga doen

**1. Variabelen kloppend maken (kernfix)**
- Laatste admin-bericht uit `chat_messages` van het gesprek ophalen en als `message_preview` meegeven (HTML-escaped, regelovergangen naar `<br>`, afgekapt op ~600 tekens).
- `chat_url` meegeven met dezelfde waarde als `portal_link`, zodat de knop werkt; `portal_link` blijft ook staan voor compatibiliteit.
- De ingebouwde fallback-HTML (als het DB-template ontbreekt) krijgt hetzelfde berichtblok.

**2. Pre-sales / website-bron een werkende bestemming geven**
- Link wordt `https://bureauvlieland.nl/?chat=open`, en de floating widget opent zichzelf bij die parameter, met naam/e-mail voorgevuld.
- Extra, en voor pre-sales eigenlijk de natuurlijkste route: de mail krijgt een `Reply-To` van de vorm `reply+chat-<conversation_id>@reply.bureauvlieland.nl` plus de regel "u kunt ook direct op deze e-mail antwoorden". In `inbound-email` komt een route bij die `chat-<uuid>` herkent en het antwoord als bezoekersbericht in datzelfde gesprek zet, zodat het in het Berichtencentrum terugkomt.

**3. Throttle niet langer berichten laten opslokken**
Nu geldt max 1 mail per gesprek per 10 minuten. Omdat de mail vanaf nu de inhoud bevat, is stil laten vallen ongewenst: de throttle wordt verlaagd naar 2 minuten en overgeslagen wanneer er sinds de laatste notificatie een nieuw admin-bericht is.

**4. Borging tegen herhaling**
Een test die, voor elk actief e-mailtemplate, alle `{{variabelen}}` in subject en body vergelijkt met wat de aanroepende edge function meegeeft. Zo faalt de build voortaan als een template een placeholder heeft die niemand vult — dit was precies de oorzaak.

## Technisch

- `supabase/functions/notify-new-chat-reply/index.ts`: message ophalen, `chat_url` + `message_preview` doorgeven, `presales`/`website`-branch, `ReplyTo`, throttle-logica.
- `supabase/functions/inbound-email/index.ts`: `chat-<uuid>`-route naar `chat_messages` (sender_type `customer`), inclusief bijwerken van gesprekstatus/`last_message_at`.
- `src/components/site/PreSalesChatWidget.tsx`: auto-open op `?chat=open`.
- Nieuwe test in `src/lib/__tests__/`, plus deploy van beide edge functions en een echte testmail-verificatie via het Berichtencentrum.
