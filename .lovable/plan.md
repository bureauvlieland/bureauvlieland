Doel: bezoekers informeren dat Erwin tot 20 juli telefonisch minder goed bereikbaar is, zonder aanvragen af te schrikken.

Advies: geen homepagebanner of blokkerende pop-up. In plaats daarvan een kleine, vriendelijke melding op de plekken waar mensen contact zoeken: de contactpagina en de footer. De website en het aanvraagformulier blijven volledig beschikbaar.

### Wat we bouwen

1. **Reusable vakantiecomponent**  
   Een kleine `VacationNotice`-component die:
   - de periode "t/m 20 juli" toont,
   - benadrukt dat de website en mail gewoon werken,
   - telefoon als "iets langer reageert" positioneert,
   - een hardcoded einddatum (`2025-07-20`) heeft zodat de melding na die datum automatisch verdwijnt,
   - gebruikmaakt van het bestaande info/soft kleurensysteem (`info-soft` / `text-info`) in plaats van alarmerend rood.

2. **Contactpagina** (`src/pages/Contact.tsx`)
   - Een lichte informatiebalk boven de contactkaarten, of een klein badge/label bij de "Telefonisch"-kaart.
   - Tekst in de lijn van: "Tot 20 juli reageer ik telefonisch iets minder snel. Mailen via hallo@bureauvlieland.nl werkt gewoon — en uiteraard kunt u vrijblijvend een aanvraag starten."

3. **Footer** (`src/components/Footer.tsx`)
   - Een subtiele regel direct onder het telefoonnummer in de contactkolom.
   - Zelfde tekst, compacte weergave, zodat de melding ook op iedere pagina zichtbaar is zonder de layout te domineren.

4. **Optioneel: Navigation** (niet mijn voorkeur, beslisbaar)
   - Een heel kleine, niet-klikbare badge in de header: "Beperkt telefonisch bereikbaar t/m 20 juli".
   - Alleen doen als je die informatie écht op elke pagina wilt; ik raad het af omdat het de hoofd-CTA "Start uw aanvraag" kan afleiden.

### Wat we niet doen
- Geen full-width banner op de homepage.
- Geen pop-up, modal of toast die het bezoek onderbreekt.
- Geen "gesloten"-taalgebruik; formulieren en e-mail blijven gewoon open.

### Technische details
- Geen database of backend nodig; pure presentatiecomponent.
- Component krijgt een `endDate`-prop en rendered `null` als de vakantie voorbij is.
- Aanpassingen in `Contact.tsx` en `Footer.tsx`; optioneel ook `Navigation.tsx`.
- Geen wijzigingen in de aanvraag-, partner- of admin-flows.

### Wording-voorstel
"Tot en met 20 juli ben ik telefonisch minder goed bereikbaar. E-mailen via hallo@bureauvlieland.nl gaat gewoon door, en je kunt uiteraard vrijblijvend een aanvraag starten. Reacties kunnen iets langer duren."

Vraag: wil je de melding alleen in de footer + contactpagina (mijn advies), of ook een kleine badge in de navigatie?