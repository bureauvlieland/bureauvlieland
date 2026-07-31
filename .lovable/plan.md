## Stand van zaken (gecontroleerd)

- De webhook-URL die in de messaging service staat is de juiste endpoint van de functie `whatsapp-webhook`.
- Die functie staat in `supabase/config.toml` op `verify_jwt = false`, dus Twilio mag hem zonder token aanroepen. Daar zit het probleem niet.
- `whatsapp-webhook` heeft **nul logs**: Twilio heeft de endpoint nog nooit aangeroepen.
- Het nummer +31562700208 is een actieve WhatsApp-sender (status Online).
- Uitgaand werkt al via `whatsapp-send`; alleen inbound ontbreekt.

De messaging-service-webhook geldt uitsluitend voor senders in de sender pool van díe service. Dat controleer ik zelf via de Twilio-API met de bestaande credentials — niet handmatig door jou.

## Aanpak

### 1. Koppeling zelf verifiëren via de Twilio-API
- Ophalen van de messaging services van het account en de sender pool daarvan, plus de webhook-instelling van de WhatsApp-sender zelf.
- Daarmee stel ik feitelijk vast of +31562700208 in de service "Whatsapp bureauvlieland website" zit en waar de inbound-URL op staat. Pas als dat klopt en er nog steeds niets binnenkomt, ligt het aan de functie zelf.

### 2. Zichtbaar maken wat er binnenkomt
- Logging bovenaan `whatsapp-webhook`: elke POST logt methode, `From`, `To`, `MessageSid`, `Body`-lengte en of de signature-check slaagde. Nu is "afgewezen" niet te onderscheiden van "nooit aangekomen".
- Bij een signature-mismatch wordt de door de functie gereconstrueerde URL naast de door Twilio ondertekende URL gelogd. Dat is de klassieke valkuil: mismatch → stille 403.
- Ik test met een gesimuleerde Twilio-POST en controleer in de database dat contact + gesprek + bericht zijn aangemaakt.

### 3. Melding bij een nieuw WhatsApp-bericht
- Na het opslaan roept de webhook `notify-new-chat` aan, zodat je dezelfde e-mailmelding krijgt als bij een bericht via het websiteformulier.

### 4. Bijlagen niet stilzwijgend verliezen
- Nu wordt een foto vervangen door "[1 media-bijlage(n) — niet opgeslagen]". Ik log de media-URL's mee en maak de melding in het bericht expliciet. Media daadwerkelijk downloaden en opslaan valt buiten scope (vereist media-leesrechten op de Twilio-key); ik meld het als vervolgstap.

### 5. Admin: antwoorden binnen/buiten het 24-uursvenster
- In het WhatsApp-gesprek een regel met het laatste klantbericht en de resterende tijd van het 24-uursvenster.
- Buiten dat venster weigert WhatsApp vrije tekst; het invoerveld waarschuwt vooraf in plaats van een generieke fout achteraf.
- Twilio-foutcodes uit `whatsapp-send` worden leesbaar getoond (bijv. 63016 = buiten venster, template vereist).
- Nieuwe pure helper `src/lib/whatsappWindow.ts` + Vitest-tests voor de vensterberekening en de foutcode-vertaling.

### 6. Afsluitende test
Jij stuurt één testbericht naar het nummer; ik lees logs en database uit en bevestig dat het in het Berichtencentrum landt. Toont de log dan een 403, dan is `TWILIO_AUTH_TOKEN` van een ander (sub)account dan de sender en pas ik de validatie daarop aan.

## Technisch
- Aangepast: `supabase/functions/whatsapp-webhook/index.ts` (logging, signature-diagnostiek, media-logging, `notify-new-chat`), `supabase/functions/whatsapp-send/index.ts` (leesbare Twilio-foutdoorgifte), `src/components/admin/ChatPanel.tsx` (24-uursvenster + foutmelding).
- Nieuw: `src/lib/whatsappWindow.ts` en test in `src/lib/__tests__/`.
- Geen databasemigratie; geen wijziging aan de `wa.me`-links, die wijzen al naar het juiste nummer.
