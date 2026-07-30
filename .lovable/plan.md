## Uitgangssituatie (gemeten, niet aangenomen)

Semrush (database NL) voor bureauvlieland.nl: **229 organische zoekwoorden, ~31 bezoeken/maand geschat**. Dat is een schatting van alleen Google-organisch; je echte verkeer ligt hoger. Sterke posities: `incentive vlieland` (4), `evenementen vlieland` (5), `trouwen vlieland` (5), `agenda vlieland` (6). Net naast de top-10, met veel volume: `zeehondentocht vlieland` (11-12, 260/mnd), `activiteiten op vlieland` (16, 390/mnd), `vlieland wadlopen` (12).

Technische basis is al goed: sitemap met 83 pagina's, robots.txt correct, `/llms.txt` aanwezig, gestructureerde data (Service, FAQPage, LocalBusiness) en pre-rendering staan aan. Een verse SEO-scan draait nu.

Twee concrete problemen die ik in de code zag:
1. `index.html` bevat **twee sets** `og:title` / `og:description` / `twitter:*` (regels 15-28 én 47-50) met verschillende teksten — Facebook en LinkedIn kiezen dan willekeurig, wat je social previews onbetrouwbaar maakt.
2. Google Search Console is niet gekoppeld, dus er is geen zicht op vertoningen, klikken en indexering.

## Wat ik ga doen

### 1. Technische opschoning
- Dubbele Open Graph/Twitter-tags in `index.html` verwijderen; één consistente set overhouden met de scherpste propositie ("één partij, één factuur").
- Titels boven 60 tekens inkorten (homepage, Onze werkwijze) en de fallback-meta-description terugbrengen naar ±155 tekens.
- Search Console koppelen, eigendom verifiëren en de sitemap indienen, zodat we voortaan op data sturen in plaats van aannames.

### 2. Zoekwoorden waar je bijna scoort
Per thema de bestaande pagina uitbouwen tot een echte antwoordpagina in plaats van een bouwsteen-overzicht:
- **Zeehondentocht/robbentocht** — nu ranken op `/bouwstenen` (positie 11-12 bij 260/mnd). De bestaande pagina `/zeehondentochten-vlieland` wordt de doelpagina: praktische info (duur, vertrek, seizoen, geschikt voor welke groepen), FAQ-blok en interne links vanaf bouwstenen.
- **Activiteiten op Vlieland** (390/mnd, positie 16) — `/activiteiten-vlieland` uitbreiden met categorie-indeling, seizoensinformatie en verwijzingen naar detailpagina's.
- **Wadlopen Vlieland** — eigen inhoudsblok/pagina in plaats van bouwsteen-vermelding.
- **Agenda/evenementen Vlieland** — je scoort hier al goed vanaf de homepage; dit verdient een eigen agenda-pagina zodat de homepage vrijkomt voor je kernpropositie.

### 3. Vindbaarheid in AI-assistenten (ChatGPT, Claude, Perplexity)
AI-modellen citeren pagina's die een vraag letterlijk en feitelijk beantwoorden.
- `/llms.txt` uitbreiden met de nieuwe contentpagina's en met een compact "feiten"-blok (wie, waar, wat kost het ongeveer, hoe werkt de boeking).
- FAQ-schema uitbreiden op de belangrijkste landingspagina's, met vragen zoals mensen ze aan een AI stellen ("wat kost een bedrijfsuitje op Vlieland voor 25 personen?", "hoe kom ik met een groep op Vlieland?").
- Op elke commerciële pagina een kort, feitelijk samenvattingsblok bovenaan (aantallen, duur, seizoen, prijsindicatie) — dat is precies het formaat dat AI-antwoorden overnemen.
- Organization/LocalBusiness-schema aanvullen met `sameAs`-links naar je Facebook- en Instagram-profielen, zodat je merk als entiteit herkend wordt.

### 4. Social (Facebook & Instagram)
Je hebt al een social publisher voor IG+FB met AI-concepten en handmatige goedkeuring. Die maken we effectiever:
- **Deelbare previews**: één consistente og-afbeelding en heldere titels, zodat een link in een FB-post er verzorgd uitziet.
- **UTM-tagging** in de gedeelde links vanuit de publisher, zodat je in analytics ziet welke posts bezoekers en aanvragen opleveren.
- **Content-koppeling**: de publisher put nu uit nieuwe bouwstenen en partners. Ik voeg voorbeeldprogramma's en de nieuwe contentpagina's toe als bron, zodat social en website dezelfde verhalen vertellen en verkeer naar de nieuwe pagina's sturen.
- **Link-in-bio-pagina** voor Instagram (Instagram staat geen links in posts toe): één compacte pagina met de drie routes (losse activiteiten / programma samenstellen / maatwerk) plus WhatsApp-contact.

## Wat dit niet doet
Per-pagina social previews (een eigen afbeelding per landingspagina bij delen op Facebook) vragen server-side rendering; die kan de huidige opzet niet betrouwbaar leveren.

## Technische details
- `index.html`: dedupliceren van `og:*` en `twitter:*`, titel/description inkorten.
- Nieuwe/uitgebreide contentsecties in bestaande pagina's onder `src/pages/` (Zeehondentochten, Activiteiten, Wadlopen, Agenda) met JSON-LD via Helmet.
- `public/llms.txt` en `public/sitemap.xml` (via `scripts/generate-sitemap.ts`) bijwerken met nieuwe routes.
- `StructuredData.tsx`: `sameAs` met FB/IG-profielen.
- Social publisher: UTM-parameters bij linkopbouw in de edge function, extra bronprioriteit voor voorbeeldprogramma's.
- Nieuwe route `/links` voor Instagram-bio, uitgesloten van indexering noch geblokkeerd — gewoon een lichte pagina.

Ik heb hiervoor je Facebook- en Instagram-profiel-URL's nodig; die kun je bij de uitvoering aanleveren of ik haal ze uit de social-instellingen.

De verse scan draait nu; resultaten verschijnen in het SEO-tabblad.
