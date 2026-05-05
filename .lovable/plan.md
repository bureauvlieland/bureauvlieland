## Doel

Hoofdnavigatie inrichten op conversie (naar offerte/programma samenstellen), terminologie consistent maken, en zorgen dat élke publieke pagina ergens vindbaar is — in nav, footer, of via een nieuwe sitemap-pagina.

## 1. Inventarisatie publieke pagina's

**In huidige nav/footer aanwezig:** `/`, `/logies-vlieland`, `/voorbeeldprogrammas`, `/bouwstenen`, `/partners`, `/over-ons`, `/contact`, `/samenwerken`, `/catering`, `/evenementen`, `/programma-samenstellen`, `/algemene-voorwaarden`, alle B2B/B2C-landings (`/bedrijfsuitje-vlieland`, `/teamuitje-vlieland`, `/meerdaags-bedrijfsuitje-vlieland`, `/heisessie-vlieland`, `/zakelijk-evenement-vlieland`, `/incentive-reis-vlieland`, `/trouwen-op-vlieland`, `/groepsweekend-vlieland`, `/jubileum-vlieland`, `/familieweekend-vlieland`).

**Nu nergens gelinkt (gaten):**

- `/diensten` — staat in sitemap.xml, maar geen nav-link
- `/voor-wie` — alleen in sitemap.xml
- `/bedrijfsuitje-ideeen-vlieland` — alleen in sitemap.xml
- `/programmamodules` — duplicaat-route van Voorbeeldprogrammas
- `/activiteiten-boeken` — geen link
- `/logies-aanvragen` — alleen vanuit logies-flow
- `/offerte` — geen link
- `/binnenkort` — coming-soon, prima zo

**Routes om op te ruimen (in App.tsx):** `/programmamodules` opheffen of redirecten naar `/voorbeeldprogrammas` (duplicaat). `/diensten` houden voor SEO maar als secundair.

## 2. Nieuwe hoofdnavigatie (conversiegericht)

```text
[Logo]   Programma's ▾   Logies   Inspiratie ▾   Over ons   [📞 0562 700 208]   [▶ Stel uw programma samen]
```

**Programma's (mega-dropdown, 2 kolommen):**

- Kolom "Begin hier" (grote knoppen):
  - Stel zelf samen → `/programma-samenstellen`
  - Kies een voorbeeldprogramma → `/voorbeeldprogrammas`
  - Programma op maat → `/programma-samenstellen?mode=maatwerk`
- Kolom "Verken het aanbod":
  - Alle bouwstenen → `/bouwstenen`
  - Catering → `/catering`
  - Evenementen → `/evenementen`
  - Activiteiten boeken → `/activiteiten-boeken`

**Logies** (single link) → `/logies-vlieland`  
  
`ES: Logies veranderen in Overnachten`

**Inspiratie ▾ (dropdown — voorheen "Ons aanbod", nu staf/SEO i.p.v. hoofdaanbod):**

- Voor bedrijven (subkop):
  - Bedrijfsuitje · Meerdaags bedrijfsuitje · Teambuilding · Heisessie · Zakelijk evenement · Incentive reis · Bedrijfsuitje ideeën
- Voor privé (subkop):
  - Trouwen · Groepsweekend · Jubileum · Familieweekend
- Onderaan: "Alle voorbeelden bekijken" → `/voor-wie`  
  
Dit onderdeel slaat dan toch nergens op? Inspiratie en dan toon je eigenlijk voor wie. Inspiratie zit meer in de voorbeeldprogramma's. Ik denk dat dit naar de foot moet of "voor wie"   


**Over ons ▾:**

- Over Bureau Vlieland → `/over-ons`
- Onze werkwijze → `/diensten`
- Aangesloten partners → `/partners`
- Contact → `/contact`

**Rechts in header:** telefoonnummer (klikbaar) + primary CTA-knop **"Stel uw programma samen"** (één term, vervangt huidige "Vraag uw offerte aan").   
  
ES: Wat mij betreft geen focus op het telefoonnummer, want dat neem ik 9 van de 10 keer niet op. 

**Mobiel:** dezelfde structuur in accordion-vorm; CTA-knop bovenaan het sheet.

## 3. Terminologie-consistentie

Eén CTA-term overal: **"Stel zelf uw programma samen"** (header, hero, FinalCTA, footer-kolom "Direct aan de slag", Diensten-pagina). Verwijder varianten "Vraag uw offerte aan" / "Stel uw offerte samen" / "Vraag een offerteaan". Secundaire CTA blijft **"Programma op maat"** voor de maatwerk-route.

Footer-link "Stel uw offerte samen" → "Stel uw programma samen". Diensten-pagina "Liever maatwerk?" → "Programma op maat".

## 4. Nieuwe footer (compacter, 4 kolommen)

```text
Kolom 1: Bureau Vlieland       Kolom 2: Begin hier           Kolom 3: Inspiratie         Kolom 4: Online boeken
- Logo + pitch                 - Stel uw programma samen     - Bedrijfsuitje             - Materiaalbeheer & verhuur
- Adres / tel / mail           - Programma op maat           - Teambuilding              - Fietsverhuur
- Social icons                 - Voorbeeldprogramma's        - Heisessie                 - Losse activiteiten
                               - Bouwstenen                  - Zakelijk evenement        - Café Boven
                               - Logies                      - Incentive reis            - Oliva Vlieland
                               - Catering                    - Trouwen op Vlieland
                               - Evenementen                 - Groepsweekend
                                                             - Jubileum
                                                             - Familieweekend
                                                             - Bedrijfsuitje ideeën

Onderaan (utility-rij):
Over ons · Onze werkwijze · Partners · Samenwerken · Contact · Sitemap · Algemene voorwaarden · Partner login
© 2026 · Wadden-ambassadeur badge · NORISK
```

Verwijdert duplicaat "Stel uw offerte samen", brengt álle pagina's terug, en groepeert per intent (handelen / inspireren / extern boeken).

## 5. Nieuwe pagina: `/sitemap`

HTML-sitemap voor bezoekers (los van `public/sitemap.xml` voor crawlers). Eenvoudige pagina met gegroepeerde links naar elke publieke route — gelinkt vanuit footer en 404-pagina. Gegroepeerd als:

- Start (Home, Programma samenstellen, Programma op maat, Contact)
- Programma's (Voorbeeldprogramma's, Bouwstenen, Catering, Evenementen, Activiteiten boeken)
- Logies (Logies Vlieland, Logies aanvragen)
- Voor bedrijven (alle B2B-landings)
- Voor privé (alle B2C-landings)
- Over ons (Over, Werkwijze, Voor wie, Partners, Samenwerken)
- Juridisch (Algemene voorwaarden, Partnervoorwaarden)
- Partner & Admin (Partner login)

## 6. Opruimen routes & bestanden

- `/programmamodules` → 301-style `<Navigate to="/voorbeeldprogrammas" replace />` in `App.tsx`.
- `public/sitemap.xml` aanvullen met de ontbrekende publieke URL's (`/voor-wie`, `/bedrijfsuitje-ideeen-vlieland`, `/activiteiten-boeken`, `/sitemap`).
- `Diensten.tsx` CTA-tekst harmoniseren.

## Technische details

**Bestanden te wijzigen:**

- `src/components/Navigation.tsx` — nieuwe topnav-structuur (Programma's-mega vervangt "Ons aanbod"; "Programma's" dropdown weg; Inspiratie + Over ons toegevoegd; CTA-knop tekst).
- `src/components/navigation/MegaDropdown.tsx` — herstructureren naar twee mega-dropdowns: `ProgrammasMega` (begin hier + verken aanbod) en `InspiratieMega` (B2B/B2C landings, "Alle voorbeelden" → `/voor-wie`). Of houd één component met variant-prop.
- `src/components/navigation/MobileNav.tsx` — accordion-secties spiegelen aan nieuwe nav.
- `src/components/Footer.tsx` — herindeling naar 4 nieuwe kolommen + utility-rij met sitemap-link.
- `src/components/home/FinalCTA.tsx`, `src/components/home/HeroEditorial.tsx`, `src/pages/Diensten.tsx` — CTA-tekst uniformeren.
- `src/pages/Sitemap.tsx` — nieuwe pagina (eenvoudig, met `Helmet`, `Navigation`, `Footer`, gegroepeerde lijsten).
- `src/App.tsx` — route `/sitemap` toevoegen; `/programmamodules` → Navigate redirect.
- `public/sitemap.xml` — toevoegen ontbrekende URL's.

**Geen DB-wijzigingen.** Geen breaking change voor bestaande URL's (behalve `/programmamodules` dat redirect).

## Eindplaatje

- Eén duidelijke conversie-CTA in de header, zichtbaar op elke pagina.
- "Programma's" is het zwaartepunt — daar wonen de drie tracks (zelf / voorbeeld / op maat).
- "Inspiratie" vangt alle SEO-landingspagina's zonder ze als hoofdaanbod te framen.
- Footer + nieuwe `/sitemap` zorgen dat geen enkele publieke pagina meer "wees" is.