## Doel

Mailen vanaf de klantenkaart wordt één slimme composer: geen HTML-templates meer in een tekstveld, maar korte **intenties** die de AI briefen, met het volledige projectdossier als context. Eén voorstel per keer, dat je met een instructie kunt laten herschrijven.

## Wat er verandert in de UI (`SendProjectEmailSheet`)

1. **Template-dropdown verdwijnt** uit deze sheet. De `email_templates`-tabel en `/admin/email-templates` blijven bestaan voor automatische systeemmails (offerte verstuurd, partner-aanvraag, herinneringen) — daar hoort HTML wél.
2. **Intentie-chips** komen in de plaats. Een rij korte knoppen, contextueel gefilterd op projectstatus:
   - Herinnering: programmavoorstel nog niet bekeken
   - Vraag om akkoord / ondertekening
   - Statusupdate zonder actie
   - Wijziging doorgeven / bevestigen
   - Betaling of factuur opvolgen
   - Nazorg / bedankt na uitvoering
   - Antwoord op laatste bericht
   - Vrij (eigen instructie)
   Klik = AI genereert direct onderwerp + body. Geen HTML in de editor, alleen platte tekst — precies wat het `send-project-email`-eindpunt netjes in de Bureau Vlieland-skeleton wrapt.
3. **Herschrijf-balk** onder het bericht na een suggestie: "Korter", "Warmer", "Formeler", "Voeg vervolgstap toe" + vrij instructieveld → nieuwe generatie op basis van de huidige tekst (dus verfijnen, niet opnieuw beginnen).
4. **Contextpaneel (inklapbaar)** boven de suggestie: "AI gebruikt: 4 verzonden mails, 2 antwoorden van de klant, laatste contact 12 dagen geleden, status In afstemming". Zo zie je waarop het voorstel gebaseerd is.
5. **Concept blijft bewaard** per project zolang de sheet open/heropend wordt binnen dezelfde sessie, zodat een per ongeluk gesloten sheet geen tekst kost.

## Wat er verandert in de AI (`compose-followup-email`)

De functie krijgt het volledige dossier mee in plaats van alleen onderwerpen van de laatste 10 mails:

- **Uitgaande én inkomende e-mailinhoud** uit `project_communications` (subject + content, richting, datum) — nu ziet de AI ook wat de klant zélf schreef.
- **`email_log`** blijft erbij voor systeemmails die niet in het dossier staan (welke automatische mail is al gestuurd, en wanneer).
- **Chatberichten** uit `chat_messages` via de gekoppelde `chat_conversations`.
- **Admin-notities** (`admin_notes`) en de laatste history-regels van het project.
- **Programma-inhoud op hoofdlijnen**: aantal onderdelen, welke al goedgekeurd/open staan, datum, aantal personen, offerte-geldigheid.
- Alles gebundeld tot maximaal ~15 recente dossieritems, chronologisch, met een berekend "dagen sinds laatste klantcontact".

Nieuwe request-velden: `intent` (de gekozen intentie), `currentBody` + `refineInstruction` (voor herschrijven), naast de bestaande `instruction`.

De system prompt wordt strakker: per intentie een eigen doel-instructie, expliciet verbod op herhalen van wat al gezegd is, expliciete opdracht om aan te sluiten op het laatste bericht van de klant (naam, toon, gestelde vraag), en de bestaande harde regels blijven (u-vorm, geen verzonnen prijzen/data, `{{portal_url}}`, platte tekst, max ~180 woorden). Model: `google/gemini-3.6-flash`.

## Technisch

- `supabase/functions/compose-followup-email/index.ts`: dossier-opbouw uitbreiden, intent-map en refine-modus toevoegen, prompt herschrijven, daarna deployen.
- `src/components/admin/SendProjectEmailSheet.tsx`: template-blok en `render-email-template`-aanroep eruit, intentie-chips + herschrijf-balk + contextpaneel erin. `templateHtmlRef`/`templatePlainRef` en de `bodyHtml`-doorgifte kunnen weg voor deze sheet (het eindpunt blijft `bodyHtml` ondersteunen voor andere aanroepers).
- `templateFilter`-prop wordt overbodig; call-sites die die meegeven worden opgeruimd. Als een plek nog wél een template-keuze nodig heeft (bijv. pre-sales), houden we daar een aparte lichte variant of laten we die ongemoeid — dat check ik per call-site.
- Nieuwe unit-tests voor de intentie→prompt-mapping en de dossier-samenvatting (context-builder als los `_shared`-bestand zodat hij testbaar is).

## Buiten scope

Automatische systeemmails, de e-mailtemplate-beheerpagina en de HTML-wrapper blijven zoals ze zijn.
