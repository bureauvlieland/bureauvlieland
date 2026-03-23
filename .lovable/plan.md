

## Grondige Review: Teksten, Werking, Positionering & Usability

### A. Kritieke bugs

**1. Dubbele route `/admin/partners` (App.tsx, regel 180 + 187)**
Er staan twee routes met exact hetzelfde pad `/admin/partners`. De eerste (regel 180) doet een redirect naar `/admin/crm?tab=partners`, maar de tweede (regel 187) rendert `<AdminPartners />`. Omdat React Router de eerste match neemt, is de `AdminPartners`-pagina onbereikbaar. Oplossing: verwijder regel 187 (de losse `AdminPartners` route).

**2. NotFound redirects naar niet-bestaande hash-ankers**
`NotFound.tsx` stuurt oude URLs door naar `/#contact`, `/#over-erwin`, `/#testimonials`, `/#voor-wie`. Maar de `Index.tsx` homepage bevat geen elementen met deze id's. Deze redirects eindigen op de homepage zonder te scrollen. Oplossing: redirect naar de juiste standalone pagina's (`/contact`, `/over-ons`, `/voor-wie`) of voeg de id's toe aan Index.tsx.

**3. "Liever maatwerk?" knoppen leiden naar dezelfde plek als de primaire CTA**
Op 9 pagina's staat een "Stel uw programma samen" knop naast een "Liever maatwerk?" knop. Beide linken naar `/programma-samenstellen`. Dit is verwarrend: de gebruiker verwacht een ander pad (bv. contact of een maatwerkintake). Oplossing: laat "Liever maatwerk?" naar de MaatwerkIntakeForm gaan (bv. `/programma-samenstellen?mode=maatwerk`) of naar `/contact`.

### B. Overbodige pagina's en routes

**4. `Diensten.tsx` is grotendeels overbodig**
De pagina herhaalt de Index-services en linkt weer terug naar de configurator. De MegaDropdown biedt al directe toegang tot alle specifieke landingspagina's. Diensten dient geen uniek doel meer in de klantreis.

**5. `VoorWie.tsx` heeft overlap met MegaDropdown-structuur**
De "Voor wie" pagina beschrijft doelgroepen, maar de MegaDropdown categoriseert al op "Voor bedrijven" en "Voor privé". De pagina voegt weinig toe aan de funnel. Overweeg om de content te integreren in de homepage of te laten vervallen.

**6. `Programmas.tsx` (/samenwerken) vs `VoorbeeldprogrammaOverzicht.tsx` (/voorbeeldprogrammas)**
Twee pagina's voor inspiratie/samenwerking. De nav linkt "Inspiratie" naar `/voorbeeldprogrammas`. De route `/bouwstenen` leidt naar `Voorbeeldprogrammas.tsx` (bouwstenen overzicht). Dit is verwarrend: `/bouwstenen` klinkt als bouwstenen, maar toont voorbeeldprogramma's.

**7. `ComingSoon.tsx` (/binnenkort) is alleen nog nodig als fallback voor FeatureGate**
Als `customer_portal_enabled` aan staat, wordt deze pagina nooit getoond. Kan intern blijven maar de tekst is verouderd ("We werken hard aan ons nieuwe platform").

### C. Tekst- en tonaliteitsproblemen

**8. Inconsistent taalgebruik: "je/jij" vs "u"**
- `Diensten.tsx`: "Weet je al wat je wilt?" en "Stel direct je programma samen"
- `Index.tsx`, `BedrijfsuitjeVlieland.tsx`: "Stel uw programma samen"
- `Programmas.tsx`: "jullie de inhoud, wij de uitvoering" (terecht informeler voor B2B-samenwerking)

Kies consistent: **"u"** voor de klantgerichte pagina's, **"jullie/je"** uitsluitend voor de samenwerkingspagina.

**9. Verouderde evenementdatums**
`Evenementen.tsx` toont "19 april 2026" (Vuurtorenloop) en "26 september 2026" (Amusetour). De huidige datum is 23 maart 2026 — de Vuurtorenloop is bijna. Na de datum wordt de pagina misleidend. Overweeg een dynamisch systeem of een waarschuwing.

### D. Navigatie & UX optimalisaties

**10. MegaDropdown mist "Evenementen" en "Logies"**
De MegaDropdown toont bedrijven/privé landingspagina's + Diensten/Catering. "Evenementen" is nergens in de navigatie te vinden — alleen via directe URL. "Logies" staat als losse nav-link, maar ontbreekt in de MegaDropdown. Overweeg Evenementen + Logies toe te voegen.

**11. GlobalCartDrawer verbergt op verkeerde pagina's**
De floating cart-knop verbergt zich op alle `/partner`, `/admin` en `/programma/` routes. Maar op `/mijn-programma/` (klantportaal) wordt hij ook verborgen — dat is correct. Echter, op `/logies-aanvragen` en `/activiteiten-boeken` is de cart-knop zichtbaar terwijl die pagina's een los boekingssysteem zijn. Verwarrend als de gebruiker daar items toevoegt die niet in de configurator-cart passen.

**12. Offerte-pagina `/offerte` is een standalone formulier, los van de configurator**
De site heeft twee ingangen voor aanvragen: de configurator (`/programma-samenstellen`) en het offerte-formulier (`/offerte`). Het offerteformulier is niet gelinkt vanuit de navigatie of footer. Het wordt alleen gevonden via directe URL of NotFound-redirects. Overweeg het te verwijderen of expliciet als alternatief te positioneren.

### E. Footer & SEO

**13. Footer linkt "Maatwerk aanvragen" naar `/programma-samenstellen`**
Identiek aan "Programma samenstellen" — twee links naar dezelfde pagina in dezelfde kolom. Vervang door een link naar `/contact` of een anchor naar de maatwerk-intake.

**14. Footer "Losse activiteiten" linkt naar extern boekingssysteem**
Er is nu ook een interne `/activiteiten-boeken` pagina. Overweeg die intern te linken in plaats van naar de externe URL.

### F. Aanbevolen acties (geprioriteerd)

| Prio | Item | Impact |
|------|------|--------|
| 1 | Fix dubbele `/admin/partners` route | Bug: pagina onbereikbaar |
| 2 | Fix NotFound hash-redirects naar werkende pagina's | SEO + UX: broken redirects |
| 3 | "Liever maatwerk?" differentieren van primaire CTA | Conversie: verwarrende keuze |
| 4 | Taalgebruik uniformeren (je→u op klantpagina's) | Professionaliteit |
| 5 | MegaDropdown aanvullen met Evenementen | Vindbaarheid |
| 6 | Footer dedupliceren (maatwerk vs programma link) | Overzichtelijkheid |
| 7 | Beoordeel of Diensten-pagina nog nodig is | Funnel-vereenvoudiging |
| 8 | ComingSoon-tekst updaten | Actualiteit |

### Bestanden voor wijzigingen
1. `src/App.tsx` — verwijder dubbele route
2. `src/pages/NotFound.tsx` — fix hash-redirects
3. 9 pagina's met "Liever maatwerk?" — differentieer link
4. `src/pages/Diensten.tsx` — uniformeer taal
5. `src/components/navigation/MegaDropdown.tsx` — evenementen toevoegen
6. `src/components/Footer.tsx` — dedupliceer links
7. `src/pages/ComingSoon.tsx` — update tekst

