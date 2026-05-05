## Strategische herpositionering + nieuwe hero

### A. Positionering — van "regie" naar "lokale specialist"

| Was | Wordt |
|---|---|
| "Wij als regie" / "verzorgde regie" | **"Uw lokale specialist op Vlieland"** |
| Orkestrator / regisseur | Hostess · bellboy · reisagent · programma-ontwikkelaar |
| Aanwezig op de dag zelf | Voor en achter de schermen — gasten ervaren de eilanders |
| Eén regie | **Eén partij, één factuur, één aanspreekpunt** |

Centrale claim:
> **"Uw lokale specialist voor Vlieland."** Wij ontwikkelen het programma, regelen alles met de eilanders en sturen u één factuur. Op het eiland zelf bent u te gast bij onze partners.

### B. Nieuwe hero (`HeroEditorial.tsx`) — full-bleed beeld

Weg met het donkerblauwe vlak + losse vuurtoren-collage. Hero wordt één immersieve, full-bleed sfeerfoto met warme leesbaarheidsgradient onderin.

**Layout:**
```text
┌─────────────────────────────────────────────────────┐
│  full-bleed Vlieland-foto (strand/duinen golden hr) │
│  warme gradient onderin voor leesbaarheid           │
│                                                     │
│  · est. 2017 — 53°17′N — Vlieland                   │
│                                                     │
│  Het eiland                                         │
│  als bestemming.        ← cursief, sunset           │
│  Wij als gids ernaartoe.                            │
│                                                     │
│  [Stel uw programma samen →]  [Bekijk voorbeeld-    │
│                                 programma's]        │
│  ─────────────────────────────────────────────────  │
│  8+ jaar · 200+ programma's · 20+ partners · 1 fact.│
└─────────────────────────────────────────────────────┘
```

**Wijzigingen:**

1. **Achtergrond** — nieuwe AI-foto via `google/gemini-3-pro-image-preview`, opgeslagen als `src/assets/hero-vlieland-editorial.jpg` (+ webp). Prompt:
   > *Cinematic editorial wide-angle photograph of Vlieland Dutch Wadden island at golden hour. Empty white sand beach with dune grasses left, calm sea right, soft warm sunset light, distant lighthouse silhouette far on the horizon, atmospheric, premium travel-magazine aesthetic, 16:9, no people, no text.*
   - Full-opacity, full-bleed; subtiele Ken Burns blijft.
2. **Overlays** — vervang harde donkerblauwe gradients door zachte: `from-ocean-deep/85 via-ocean-deep/30 to-transparent` van onder naar boven; kleine vignet bovenin voor witte nav-leesbaarheid.
3. **Vuurtoren-mini-collage verwijderen** — incl. "est. sinds 2017" sticker. Het label verhuist naar de meta-regel boven de headline (`· est. 2017 — 53°17′N — Vlieland`). Vrijgekomen ruimte = headline mag voller ademen.
4. **Bottom horizon strip** (`beachImage`) verwijderen — overbodig.
5. **Headline** zonder donkerblauwe blur-box; alleen tekst met text-shadow voor contrast:
   ```
   Het eiland
   als bestemming.            ← cursief, sunset
   Wij als gids ernaartoe.
   ```
6. **Body-paragraaf** vervangt "orkestreert / verzorgde regie":
   > Bureau Vlieland is uw lokale specialist voor groepsbezoek aan Vlieland. Wij ontwikkelen het programma, boeken alle eilandpartners en sturen u **één factuur**. Op het eiland bent u te gast bij gidsen, koks en schippers die hier wonen en werken.
7. **CTA's** — primaire blijft "Stel uw programma samen" → `/programma-samenstellen`. **Secundaire wordt "Bekijk voorbeeldprogramma's" → `/voorbeeldprogrammas`** (vervangt "Onze werkwijze"; brengt bezoekers direct in concreet aanbod, sterkere conversie-funnel).
8. **Stats-strip** op donkere onderkant van het beeld:
   - 8+ jaar lokale specialist
   - 200+ programma's georganiseerd
   - 20+ lokale partners
   - 1 factuur, alles geregeld

### C. Manifesto-sectie (`ErwinManifesto.tsx`)

- Quote: *"…dát is regie"* → **"…dát is lokaal vakmanschap. Wij zorgen dat alles vanuit één hand klopt — de eilanders doen de rest."**
- Tegel "Eén regie" → **"Eén factuur"** (van eerste contact tot eindafrekening: één aanspreekpunt voor alles wat u op Vlieland boekt).
- Tegel "Lokaal" → benadrukt netwerk: *"Wij wonen op Vlieland en werken al jaren met dezelfde gidsen, koks en hoteliers."*

### D. Site-brede terminologie-update

| Bestand | Wijziging |
|---|---|
| `src/pages/Index.tsx` (meta) | "Maatwerkprogramma's met lokale regie en catering" → **"Lokale specialist voor groepsprogramma's op Vlieland — één partij, één factuur."** |
| `src/components/Hero.tsx` (legacy) | "professionele inhoud met lokale regie, gidsen en catering" → "professionele programma-ontwikkeling met de beste lokale gidsen, koks en hoteliers" |
| `src/components/Services.tsx` | pill "Programma & regie" → **"Programma & boekingen"**; "Jullie regie, onze uitvoering" → **"Jullie inhoud, onze lokale uitvoering"** |
| `src/components/ForWho.tsx` | "ontstaat door regie" → "ontstaat door goede voorbereiding en lokale partners"; "Eén regiepartij…" → **"Eén partij, één factuur — programma, begeleiding en catering geregeld"**; "professionele regie past" → "lokale kwaliteit past" |
| `src/components/home/FinalCTA.tsx` | trust-pill "· Lokale regie" → **"· Lokale specialist"** |
| `src/pages/VoorWie.tsx` | "professionele regie centraal stellen" → **"kwaliteit en één aanspreekpunt centraal stellen"** |
| `src/pages/Diensten.tsx` | "programma, regie & catering" → **"programma, boekingen & catering"**; subhead → **"Eén partij voor programma-ontwikkeling, boekingen en catering — één factuur"** |
| `src/pages/TeamuitjeVlieland.tsx` | "Lokale regie, korte lijnen" → **"Lokale specialist, korte lijnen"** |
| `LogiesVlieland.tsx`, `TrouwenOpVlieland.tsx` | ongewijzigd (gebruiken "regie" in juiste context — klant heeft eigen regie) |

### E. Memory

- Nieuwe `mem://style/positioning-language` met positionering en woorden-lijst.
- Update Core in `mem://index.md`: "Bureau Vlieland = lokale specialist / reisagent / boekingskantoor + programma-ontwikkelaar. Niet 'regie' op het eiland zelf. Eén partij, één factuur."

### Out-of-scope

Logo/kleuren/navigatie/routes ongewijzigd. Geen partner-/admin-portaal- of e-mailtemplate-wijzigingen.

### Bestanden die wijzigen

`src/components/home/HeroEditorial.tsx`, `src/components/home/ErwinManifesto.tsx`, `src/components/home/FinalCTA.tsx`, `src/components/Hero.tsx`, `src/components/Services.tsx`, `src/components/ForWho.tsx`, `src/pages/Index.tsx`, `src/pages/Diensten.tsx`, `src/pages/VoorWie.tsx`, `src/pages/TeamuitjeVlieland.tsx`, nieuwe asset `src/assets/hero-vlieland-editorial.jpg` (+ webp), memory-updates.
