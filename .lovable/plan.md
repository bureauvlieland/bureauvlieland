## Aanpassing op vorige plan

Eens met je inzicht: `/bouwstenen` is visueel en inhoudelijk de sterkere inspiratiepagina (kaarten met beeld, prijs, categorieën, modale detail-views) en past beter bij hoe een klant zich oriënteert. `/activiteiten-vlieland` is meer een SEO-landingpagina met tekstblokken en categorieën. We draaien de rollen dus om:

- **`/bouwstenen` wordt de hoofd-inspiratiepagina** voor activiteiten — maar onder een klantvriendelijke naam in de navigatie.
- **`/activiteiten-vlieland` blijft bestaan** als SEO-landing (URL ongewijzigd, content ongewijzigd), maar verdwijnt uit de hoofdnavigatie. Vindbaarheid via Google + sitemap + interne link onderaan `/bouwstenen` ("Lees meer over activiteiten op Vlieland").

---

## Naamgeving "Bouwstenen" in de navigatie

"Bouwstenen" is onze interne term en zegt een klant niets. Mijn voorkeur, in volgorde:

1. **"Activiteiten"** — kort, helder, dekt de lading, sluit aan bij hoe Google-zoekers en klanten denken. Past ook in de "Wat we organiseren"-dropdown naast Overnachten / Catering / Evenementen.
2. "Activiteiten & ervaringen" — iets ruimer, geeft inspiratie-gevoel.
3. "Wat kun je doen op Vlieland" — wervender, maar lang voor een nav-item.

Voorstel: **"Activiteiten"** als nav-label, met `to="/bouwstenen"`. De URL blijft `/bouwstenen` (geen redirects, geen SEO-impact). Op de pagina zelf kunnen we de H1 evt. ook "Activiteiten op Vlieland" maken zodat het klant-perspectief consistent is — dat is een aparte redactionele keuze die ik los kan voorleggen.

---

## Aangepaste "Wat we organiseren"-dropdown

| Nav-label    | URL                       | Rol                                                       |
|--------------|---------------------------|-----------------------------------------------------------|
| Activiteiten | `/bouwstenen`             | Hoofd-inspiratiepagina (visuele kaarten, modals)          |
| Overnachten  | `/logies-vlieland`        | Logies-overzicht                                          |
| Catering     | `/catering`               | Catering-overzicht                                        |
| Evenementen  | `/evenementen`            | Zakelijk evenement / dagdeel-evenementen                  |

Wat verdwijnt uit de nav (blijft online):
- `/activiteiten-vlieland` — SEO-landing, behouden, link via footer-SEO-strook en interne link op `/bouwstenen`.
- `/wadlopen-vlieland`, `/zeehondentochten-vlieland` — detailpagina's, behouden, link via kaarten op `/bouwstenen` (modal → "Lees meer" → detailpagina) en footer-SEO-strook.
- `/snel-aanvragen`, `/activiteiten-boeken` — geen aparte nav-ingang nodig; bereikbaar via de "Start uw aanvraag"-routekeuze en via de bouwstenen-kaarten ("Direct aanvragen"-knop).

---

## Overige punten uit het vorige plan blijven staan

- Top-nav: **Wat we organiseren · Voor wie · Inspiratie · Over ons** + CTA **"Start uw aanvraag"** → `/#routes`.
- "Inspiratie"-dropdown bevat: Voorbeeldprogramma's, Bedrijfsuitje-ideeën, Onze werkwijze. ("Activiteiten" zit nu onder "Wat we organiseren", dus niet ook hier — geen dubbele exposure.)
- Footer: vier kolommen volgen de nieuwe nav. SEO-strook "Veelgevraagd op Vlieland" onderaan met long-tail links (Wadexcursie, Zeehondentocht, Bedrijfsuitje ideeën, Teamuitje, Trouwen op Vlieland, Activiteiten Vlieland, …).
- Mobiele nav: zelfde 4-secties + CTA.
- `RoutePicker.tsx` krijgt `id="routes"`; `Index.tsx` vangt `#routes` hash op voor cross-page scroll.
- Geen URL-wijzigingen, geen redirects nodig.

---

## Wat dit nu oplost

- ✅ Sterkste pagina (`/bouwstenen`) wordt de primaire ingang voor klanten.
- ✅ Geen verwarrende dubbele activiteiten-overzichten in de nav meer.
- ✅ Klantvriendelijk label "Activiteiten" i.p.v. intern jargon "Bouwstenen".
- ✅ `/activiteiten-vlieland` en alle detail-SEO-pagina's blijven online en vindbaar via Google.
- ✅ Eén heldere CTA "Start uw aanvraag" met routekeuze i.p.v. iedereen naar de configurator.

Akkoord op deze richting? Dan bouw ik in één keer: Navigation, MegaDropdown, MobileNav, Footer, RoutePicker-anker en Index hash-scroll.
