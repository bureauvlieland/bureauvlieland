

## Plan: Automatische bevestigingsmail bij logies-selectie

### Huidige situatie
Wanneer een klant een logiesofferte selecteert, wordt:
- **Partner**: automatisch een e-mail gestuurd (werkt al)
- **Klant**: géén e-mail gestuurd — er wordt een handmatige admin-todo aangemaakt ("Logies bevestiging versturen")

### Wat we gaan doen

**1. Automatische klant-bevestigingsmail toevoegen**

In `select-accommodation-quote/index.ts`, na de partner-mail, een bevestigingsmail naar de klant sturen via het bestaande template `accommodation_selected_customer`. De mail bevat:

- Naam van de gekozen accommodatie
- Aankomst- en vertrekdatum
- Aantal gasten
- Prijsoverzicht (basis + extras + totaal)
- **Informatie over de logiesverstrekker**: naam, eventueel adres/telefoon (uit `partners` tabel)
- Link naar het klantportaal
- Referentienummer

**2. Admin-todo aanpassen**

De todo "Logies bevestiging versturen" vervangen door een informatieve todo "Logies bevestigd" (lager prio, ter info) of de todo helemaal verwijderen en automatisch op "done" zetten. De todo wordt dan puur een log-entry dat de bevestiging is verstuurd.

Concreet: de todo wordt nog steeds aangemaakt maar direct op `status: "done"` gezet, zodat het in de timeline zichtbaar blijft maar niet als open taak verschijnt. Alternatief: de todo helemaal weglaten aangezien de e-maillog al het bewijs levert.

**3. E-mailtemplate verrijken**

Het `accommodation_selected_customer` template in de database aanvullen met extra variabelen:
- `{{accommodation_address}}` — adres van de partner
- `{{accommodation_phone}}` — telefoonnummer partner  
- `{{partner_description}}` — korte beschrijving indien beschikbaar
- `{{extras_list}}` — HTML-lijst van gekozen extras
- `{{portal_link}}` — directe link naar klantportaal

### Wijzigingen

| Bestand | Actie |
|---|---|
| `supabase/functions/select-accommodation-quote/index.ts` | Klant-bevestigingsmail toevoegen na partner-mail; todo aanpassen naar info-only of verwijderen |

Eén bestand. Het e-mailtemplate in de database kan via de admin-interface worden aangepast nadat de variabelen beschikbaar zijn.

