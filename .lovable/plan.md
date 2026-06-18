## Wat er nu mis gaat

Wanneer je in een project op **"Stuur e-mail"** klikt en een template kiest, gebeurt het volgende:

1. `render-email-template` haalt de template HTML op (met tabellen, gekleurde blokken, knoppen).
2. Diezelfde edge function **strip de HTML naar platte tekst** voordat hij het in het tekstveld zet — zodat je nog kunt bijwerken.
3. Bij verzenden zet `send-project-email` elke `\n` om in `<br>` en wikkelt het in een mini-header ("Bureau Vlieland" donkerblauwe balk). Resultaat = de kale stapel labels/waardes uit je screenshot.

Alle andere transactionele mails (partner-bevestiging via portaal, offertes, notificaties) gaan **wél** rechtstreeks als HTML via `getRenderedTemplate` en zijn dus niet aangetast. Dit probleem is geïsoleerd in de admin-handmatige flow (`SendProjectEmailSheet` → `send-project-email`).

## Oplossing

Behoud de oorspronkelijke template-HTML en stuur die ongewijzigd mee als de admin de body **niet** heeft aangepast. Als de admin wel typt, blijft het huidige platte-tekst-pad bestaan, maar in een nettere wrapper.

### Stap 1 — `render-email-template`
Retourneert al `{ subject, body: plain, html }`. Geen wijziging nodig.

### Stap 2 — `SendProjectEmailSheet`
- Bewaar bij templatekeuze de geretourneerde `html` + de oorspronkelijke `plain` body in refs.
- Bij verzenden: als het tekstveld nog gelijk is aan de geladen `plain` → stuur `bodyHtml: <originele html>` mee. Zo niet, stuur alleen `body` (zoals nu).
- Visuele hint onder het tekstveld: *"Template-opmaak (tabellen, knoppen, kleuren) blijft behouden zolang je de inhoud niet aanpast. Bij wijzigingen wordt het als platte tekst verzonden."*

### Stap 3 — `send-project-email`
- Accepteer optionele `bodyHtml` parameter.
- Als `bodyHtml` aanwezig is:
  - Pas alleen de placeholder-substituties toe (`{{portal_url}}`, `{{customer_name}}` etc.).
  - Verstuur die HTML rechtstreeks via Mailjet (geen `\n→<br>` transform, geen dubbele Bureau Vlieland header — de template heeft al een eigen layout-wrapper via `wrapEmailHtml`).
- Anders: huidig gedrag voor vrij getypte berichten, maar de mini-wrapper vervangen door de centrale `wrapEmailHtml` skeleton zodat zelfgeschreven mails dezelfde branding (logo + footer uit `app_settings`) hebben als de rest van het systeem.

### Stap 4 — Verificatie
Geen migratie nodig. Verifiëren door:
1. Project openen → e-mail sturen met template "Activiteit bevestigd" zonder aanpassingen → checken in test-inbox dat de groene status-tegel, knop en branding intact zijn.
2. Zelfde flow, maar één zin in het tekstveld wijzigen → mail komt aan als platte tekst maar mét logo-header en footer.

## Buiten scope

- Geen WYSIWYG-editor in het tekstveld (zou de UX flink veranderen en is niet nodig om dit probleem op te lossen).
- Geen aanpassingen aan andere transactionele mailpaden — die zijn al correct.
- Templates zelf worden niet aangepast.