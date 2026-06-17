## Batch 3 — Resterende quick wins (#5 + #9)

Twee nieuwe/uitgebouwde landingspagina's die direct ranken op brede, hoog-volume eilandtermen en interne linkjuice naar bestaande bouwstenen/programma's sturen.

---

### #5 — Zeehondentochten-landingspagina uitbouwen

**Route:** `/zeehondentochten-vlieland` (nieuwe pagina, of upgrade als er al een placeholder is)

**Doel-zoekwoorden:** "zeehondentocht vlieland", "zeehonden spotten vlieland", "zeehondenboot vlieland", "boottocht zeehonden waddenzee"

**Inhoud (zelfde sjabloon als Wadlopen-pagina):**
1. Hero met sterke H1: "Zeehondentochten Vlieland — spotten op de zandbanken"
2. Intro (wat is het, waarom Vlieland uniek: Richel, grijze + gewone zeehond)
3. "Hoe werkt het" — vertrektijden, duur, geschikt voor groepen
4. Praktisch blok — seizoen, getij-afhankelijkheid, weer, kleding, toegankelijkheid
5. "Voor groepen" — CTA naar Bureau Vlieland (incl. ferry + lunch + zeehondentocht als pakket)
6. FAQ-blok (6–8 vragen) met FAQPage JSON-LD
7. Gerelateerde activiteiten/programma's (interne links naar bouwstenen + voorbeeldprogramma's)
8. Footer-CTA: aanvraag / contact

**SEO:**
- Helmet: title (~55 chars), meta description (~150 chars), self-referencing canonical + og:url
- BreadcrumbList + FAQPage JSON-LD
- 1× hero-afbeelding (uit bestaande media library als beschikbaar; anders nieuwe imagegen) met expliciete width/height en alt
- Toevoegen aan `scripts/generate-sitemap.ts` (priority 0.8)
- Interne links vanaf homepage `ActivitiesShowcase` + Wadlopen-pagina ("ook interessant")

---

### #9 — Overzichtspagina "Activiteiten Vlieland"

**Route:** `/activiteiten-vlieland` (nieuw — naast bestaande `/bouwstenen` die meer als product-catalogus dient)

**Doel-zoekwoorden:** "vlieland activiteiten", "wat te doen op vlieland", "activiteiten vlieland groepen", "uitjes vlieland"

**Verschil met `/bouwstenen`:** bouwstenen = transactionele catalogus (filteren, prijzen, in winkelmand). Deze pagina = redactioneel SEO-overzicht dat het hele eiland-aanbod thematisch ontsluit en doorklikt naar de juiste landingspagina of bouwsteen-detail.

**Inhoud:**
1. Hero met H1 "Activiteiten op Vlieland — wat kun je doen?"
2. Intro (200–300 woorden over Vlieland als bestemming, met focus op groepen)
3. Thematische secties met elk een korte beschrijving + 3–6 doorkliks:
   - **Wadden & natuur** → Wadlopen, Zeehondentochten, Excursies Staatsbosbeheer
   - **Actief op het eiland** → Fietstochten (begeleid), MTB, blokarten, vuurtoren
   - **Cultuur & historie** → Museum Tromp's Huys, Dorpsommetje, Vuurboetsduin
   - **Eten & drinken** → Catering, lunches, BBQ
   - **Voor groepen** → link naar `/voorwie`, `/programmas`
4. "Plan een dag op Vlieland" — uitlegblok met link naar voorbeeldprogramma's
5. FAQ (5–7 vragen): seizoen, met kinderen, slecht weer, etc. + FAQPage JSON-LD
6. CTA: programma op maat / direct boeken

**SEO:**
- Helmet (~55 chars title, ~150 chars description), self-canonical
- BreadcrumbList + FAQPage + ItemList JSON-LD (de thematische lijst)
- Iedere thema-kaart linkt naar bestaande pagina (geen dode links)
- Toevoegen aan sitemap (priority 0.9 — hoog volume zoekterm)
- Link toevoegen vanuit `MegaDropdown` (Navigatie) zodat de pagina ook intern goed bereikbaar is

---

### Technisch (samenvatting voor agent)

**Nieuwe files:**
- `src/pages/ZeehondentochtenVlieland.tsx`
- `src/pages/ActiviteitenVlieland.tsx`

**Te bewerken:**
- `src/App.tsx` — twee nieuwe `<Route>` regels
- `scripts/generate-sitemap.ts` — twee entries (sitemap regenereert via predev/prebuild)
- `src/components/home/ActivitiesShowcase.tsx` — link naar Zeehondentochten als die nog niet gelinkt is
- `src/components/navigation/MegaDropdown.tsx` — link "Activiteiten Vlieland" onder Inspiratie
- `src/pages/WadlopenVlieland.tsx` — "ook interessant" blok met link naar Zeehondentochten

**Patronen:** zelfde Helmet + JSON-LD aanpak als de bestaande `WadlopenVlieland.tsx`. Hero-afbeelding via bestaande `supabase-storage` media of `imagegen` (max 1 per pagina).

**Buiten scope (later):** #10 aggregateRating-schema — wacht op Google Business Profile-koppeling met echte review-data.

---

### Verwacht resultaat
- 2 nieuwe geïndexeerde pagina's gericht op breed eiland-zoekverkeer
- Sterkere interne linkstructuur naar bouwstenen + programma-templates
- Voltooit de oorspronkelijke top-10 SEO quick wins (op #10 reviews na)