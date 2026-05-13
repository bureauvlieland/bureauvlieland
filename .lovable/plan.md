## Plan: Partner portal opschonen & aanscherpen

Scope = ingelogd partner-portaal (`/partner/*`): `PartnerLayout`, `PartnerDashboard` en de bijbehorende widgets. Niet in scope: business-logica, edge functions, e-mailtemplates, of de publieke `/partners` pagina.

---

### 1. Navigatie & sidebar (PartnerLayout)

Probleem: 9 items plat onder elkaar zonder groepering, dubbeling tussen "Mijn Profiel" en "Instellingen", actieve-route detectie is fragiel, en `impersonate` ontbreekt in het mobiele logo-link.

- Groepeer sidebar in 3 secties met `SidebarGroupLabel`:
  - **Werk** — Overzicht, Planning (alleen MAP), Mijn Aanbod, Logies, Kamersoorten, Extra's
  - **Administratie** — Facturatie
  - **Account** — Mijn Profiel, Instellingen, Handleidingen
- Voeg ongelezen-badges toe in de sidebar: actie-nodig op Overzicht, te-factureren op Facturatie (nu alleen op dashboard).
- Vervang fragiele `isActive` (string-vergelijking met `currentPath + search`) door pad-only check via `useMatch` of split.
- Mobiele header: logo-link en `Link to="/partner/dashboard"` voorzien van `impersonate` suffix (consistent met sidebar). Memory-rule: impersonate-param moet behouden blijven.
- Vervang harde `bg-amber-50 / text-amber-800` impersonatie-banner door semantische token (`bg-warning/10 text-warning-foreground`) — toevoegen indien niet bestaand.
- Toon de partner-`name` ook in collapsed-mode als tooltip op het avatar-icoon.

### 2. Dashboard-hiërarchie (PartnerDashboard)

Probleem: drie lagen die hetzelfde communiceren — `PartnerActionBanner`, `PartnerCompactStats` ("Nieuw"), en de tab "Actie nodig" tonen alle drie de pending count. Hierdoor visuele ruis en verwarring over waar te klikken.

Voorstel:
- **Verwijder** `PartnerActionBanner` als zelfstandige rij. Promoveer hem tot een conditionele "alert"-strip die alleen verschijnt wanneer er een onbehandelde tegenvoorstel-/prijswijziging-actie is met deadline-context (datum). Voor pure pending-tellers volstaan de stats.
- Maak `PartnerCompactStats` de **enige** primaire actie-laag:
  - Stat "Nieuw" → springt naar tab "Actie nodig"
  - Stat "Wacht op klant" → tab "In behandeling"
  - Stat "Klant akkoord" → tab "Akkoord"
  - Stat "Te factureren" → naar `/partner/facturatie` (huidig)
  - Toon nul-staat (`–`) ipv `0` om visuele rust te brengen.
- Verplaats `PartnerYtdModule` naar de `Facturatie`-pagina (financieel onderwerp); op het dashboard alleen een compacte één-regel YTD-strip onder de stats. Memory check: niets vereist YTD op dashboard.
- `PartnerUpcomingActivities`: zet bovenaan onder de stats wanneer er items < 14 dagen vooruit zijn; anders verbergen ipv lege card.
- Header: schrap "Partner Dashboard"-subtitel (al zichtbaar in sidebar/tab-titel). Behoud "Welkom terug, X".

### 3. Verduidelijking labels & copy

- Sidebar: "Mijn Aanbod" → "Activiteiten" (consistent met partner_type), "Logies" blijft, "Extra's" → "Logies-extra's" voor scheiding.
- Tab "Akkoord" → "Bevestigd door klant" (duidelijker, geen jargon).
- Tab "Verlopen" alleen tonen als er > 0 verlopen items zijn.
- `PartnerActionBanner` (indien behouden) — vervang "Bekijk aanvragen" door specifieker "Reageer op aanvragen".
- Toast na offerte-indienen: "Uw offerte is succesvol ingediend bij Bureau Vlieland. Zij nemen contact op met de klant." → "Uw offerte staat klaar voor de klant in het Bureau Vlieland klantportaal. U ontvangt bericht zodra de klant kiest." (consistent met daadwerkelijke flow).

### 4. Design-systeem hygiene

Probleem: harde Tailwind-kleuren overal in `PartnerActionBanner`, `PartnerCompactStats`, mobile-header impersonatie-badge → strijdig met design-systeem regels.

- Voeg semantische tokens toe in `index.css` + `tailwind.config.ts`:
  - `--info`, `--info-foreground` (blauw — wachten op klant)
  - `--success` / `--success-foreground` (al deels aanwezig?)
  - `--warning` / `--warning-foreground`
  - `--accent-purple` voor facturatie-categorie
- Refactor `PartnerCompactStats`, `PartnerActionBanner`, `PartnerLayout` impersonate-banner naar deze tokens. Geen `bg-amber-50` / `text-green-700` meer in components.

### 5. Code-structuur & refactor

`PartnerDashboard.tsx` is 855 regels met data-fetching, status-update-handlers, quote-handlers en tellers door elkaar.

- Extract data-laag naar hooks:
  - `usePartnerDashboardData(partnerToken)` — fetch + refetch + state.
  - `usePartnerItemActions(partnerToken)` — `updateItemStatus` + `registerInvoice`.
  - `usePartnerQuoteActions(partnerToken, partnerId, partnerName)` — `submitQuote` + `declineQuote`.
- Extract teller-berekeningen naar pure helper `lib/partnerDashboardCounts.ts` (testbaar, hergebruikbaar in sidebar-badges uit punt 1).
- `PartnerSettings` (27 regels stub) — controleren of pagina nog nodig is naast `PartnerProfile`/`PartnerSettingsForm`; samenvoegen indien duplicaat.

### 6. Toegankelijkheid & mobile

- `PartnerCompactStats` knoppen: voeg `aria-label` toe ("3 nieuwe aanvragen, klik om te bekijken").
- Tabs op mobiel: huidige horizontale scroll werkt, maar sticky maken (`sticky top-0 bg-background z-10`) zodat ze zichtbaar blijven tijdens scroll door lange lijst.
- Mobiele header: badge + trigger + logo nemen veel ruimte → impersonatie-badge alleen icoon op `<sm`.

### 7. Verificatie na implementatie

Per onderdeel een korte preview-check:
- `/partner/dashboard` als gewone partner én via `?impersonate=`.
- Sidebar collapse/expand op mobiel (smal viewport).
- Tab-navigatie via stat-klik.
- Offerte indienen toast-tekst.
- Geen console errors, geen kleur-regressies in dark-mode.

---

### Buiten scope (signaleren, niet uitvoeren)

- `PartnerGuides.tsx` — net opgeschoond.
- `PartnerFinance.tsx` — apart traject (zou wel YTD-module ontvangen uit punt 2).
- E-mailtemplates — apart traject (vorige beurt).
- Realtime-updates op dashboard via Supabase channel — leuk maar groter project.

### Volgorde van uitvoeren (suggestie)

1. Design-tokens (4) — fundament voor de rest.
2. Sidebar-hergroepering + impersonate-fixes (1).
3. Dashboard-hiërarchie + copy (2 + 3).
4. Code-refactor naar hooks (5).
5. A11y/mobile finetuning (6).
6. Verificatie (7).
