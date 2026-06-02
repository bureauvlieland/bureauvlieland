# Plan: optimalisatie /admin/projecten/:id

Doel: dezelfde functionaliteit, maar compacter, met meestgebruikte acties direct binnen handbereik en minder visuele ruis. Alleen frontend (`AdminRequestDetail.tsx` + 2–3 kleine sub-components). Geen wijzigingen aan data, edge functions of business logic.

## Probleemanalyse huidige pagina

Huidige verticale stapel (regel 1240 → 1796) levert ~6 schermen scrollen voordat de tabs in beeld komen:

```text
Header (titel + 7 buttons wrappen op 2-3 regels)
└─ Quote-banner (volledige Card, alleen info)
└─ Cancelled-banner (Card, niet Alert)
└─ Klant + Evenement (Card, 2 kolommen, altijd open)
└─ Groep & wensen (Card, altijd open ook als leeg)
└─ Grid 3-koloms: Status-telling | Logies | (leeg)  ← 3e kolom vaak leeg
└─ Partner-conflict (alleen bij conflict, ok)
└─ NextStepBanner (de échte primaire actie — staat 6e!)
└─ ProjectCommunicationsCard (grote hub)
└─ Tabs: Activiteiten / Financiën / Geschiedenis  ← werkelijke werkruimte
```

Pijnpunten:
- **Primaire actie ("Volgende stap") ligt onderaan**, buttons als "Word-document" en "WhatsApp" staan prominent bovenaan
- **Lege derde kolom** in status-grid als er geen logies is en programma is 1-daags
- **Banners ogen als content** (gewone `Card` met kleurtje) i.p.v. compacte `Alert`
- **Klant + evenement** altijd volledig uitgeklapt; meestal kijk je alleen naar naam/datum
- **Groep & wensen** rendert ook een lege Card als er geen catering is
- **7+ knoppen** in header wrappen lelijk; veel zijn secundair (Word, WhatsApp, Aftersales, Preview PDF)
- **Tabs starten pas na ~1400px scroll**

## Nieuwe indeling

```text
┌─ Sticky top-bar ────────────────────────────────────────────────┐
│ ← Naam · REF · [Maatwerk]   [Status-chip]   [Volgende stap ▸]  │
│ datum aanvraag · 12 pers · 2-3 mrt           [Chat] [⋯ menu]    │
└─────────────────────────────────────────────────────────────────┘

[Alert] (compacte inline-alert, alléén als geannuleerd / quote-status afwijkt)

┌─ Snel-overzicht (1 rij, 3-4 chips/min-cards) ──────────────────┐
│ 👤 Klant ▸  📅 Programma ▸  🏨 Logies ▸  📊 12 act. (3/2/7)   │
└─────────────────────────────────────────────────────────────────┘
  (popovers met details + edit; geen verticale ruimte verspild)

[Partner-conflict banner — alleen indien aanwezig]

┌─ Tabs ──────────────────────────────────────────────────────────┐
│ Activiteiten · Financiën · Communicatie · Geschiedenis          │
└─────────────────────────────────────────────────────────────────┘
  (Activiteiten is default; Communicatie krijgt eigen tab i.p.v.
   altijd-zichtbaar — scheelt 400-600px verticaal)
```

### Concreet per blok

**1. Top-bar (vervangt huidige Header + Quote-banner + NextStep-banner)**
- Eén `sticky top-0 z-30 bg-background/95 backdrop-blur border-b` strook
- Links: back-knop, titel, referentie, maatwerk-badge, quote-status badge, completion-chip
- Midden: compacte meta-regel (aanvraagdatum · personen · datums) — was nu apart blok
- Rechts:
  - **Primair**: één knop = de huidige `NextStepBanner.primaryAction` (Publiceer / Bekijk & verstuur / Stuur status-mail)
  - **Chat met klant** (vaakgebruikt, blijft zichtbaar)
  - **⋯ menu** (`DropdownMenu`) met alle secundaire acties: Klantportaal, Preview PDF, Word-document, WhatsApp, Aftersales-mail, Annuleren, (Quote-status select bij maatwerk), (Geldig-tot datum bij maatwerk)
- Quote-status + geldig-tot verhuizen naar het ⋯ menu of een kleine inline popover op de status-chip; banner verdwijnt

**2. NextStep → in top-bar als primary CTA + tooltip met `detail`-tekst**
- `NextStepBanner` component blijft bestaan maar wordt alleen gerenderd als er een blocker is die níet via een CTA op te lossen valt (bv. ontbrekende factuurgegevens vóór akkoord). Anders inline opgenomen.

**3. Snel-overzicht-rij (vervangt 3 Cards: klant/event, groep&wensen, status-grid, logies-card)**
- 4 compacte `Card`s op `grid-cols-2 lg:grid-cols-4`, elk met icoon + 1-regel samenvatting + popover/sheet voor details:
  - **Klant** — naam + bedrijf; klik → popover met e-mail/tel/edit-knop
  - **Programma** — "X dagen · Y personen"; klik → popover met datums, omschrijving, edit
  - **Logies** — status-badge óf "Logies regelen"-CTA; klik → link naar logiespagina (deel-akkoord blokje verschijnt alleen in popover)
  - **Status** — `3 ✓ · 2 ⏳ · 1 ✕` chip-row; klik → popover met volledige telling
- Groep & wensen (dietary/guest-names) wordt knop in Programma-popover. Card-render alleen tonen als er catering-items zijn (huidige `showDietary` blijft logica, maar verschijnt nu pas in detailweergave; geen lege Card meer).

**4. Banners → echte `Alert`-componenten**
- "Aanvraag geannuleerd" → `Alert variant="destructive"` (compact, geen Card)
- "Geen deel-akkoord (legacy)" → verplaatst naar logies-popover als kleine inline waarschuwing
- Partner-conflict blijft (is al een aparte component) maar krijgt `variant="destructive"` styling-pass

**5. Communicatie-hub → eigen tab**
- `ProjectCommunicationsCard` is groot en niet altijd nodig vóór het werk in Activiteiten
- Tabs worden: **Activiteiten · Financiën · Communicatie · Geschiedenis**
- Url-param `?tab=communicatie` zodat de huidige `highlightStatusEmail`-deeplink blijft werken

**6. "Lees meer" voor lange detailcontent**
- `program_description`, `general_notes`, deel-akkoord-detail, lange admin-toelichtingen krijgen `Collapsible` met "Toon meer" als ze > 2 regels zijn
- Voorkomt dat één lange beschrijving 200px verticaal eet

## Wijzigingen per bestand

- `src/pages/admin/AdminRequestDetail.tsx`
  - Regel 1240–1796 herschreven volgens bovenstaande structuur
  - Nieuwe sub-componenten (in dezelfde file of `src/components/admin/`):
    - `ProjectTopBar.tsx` — sticky bar met titel, meta, primary CTA, ⋯ menu
    - `ProjectQuickOverview.tsx` — de 4 compacte chip-cards met popovers
  - Tabs uitbreiden met `communicatie` waarde
- `src/components/admin/NextStepBanner.tsx` — kleine API-uitbreiding zodat de top-bar de `primaryAction` rechtstreeks kan consumeren (huidige props blijven backward compatible)
- Geen wijzigingen aan: `ProjectCommunicationsCard`, `AdminPartnerConflictBanner`, sheets/dialogs, edge functions, queries, types

## Verificatie

- BV-2605-0001 openen: top-bar laat correct "Volgende stap"-CTA zien; ⋯ menu bevat Word/WhatsApp/Aftersales; quote-status wijzigen werkt via popover
- Geannuleerd project: Alert-strook verschijnt, geen Card-banner
- 1-daags project zonder logies: geen lege kolom meer
- Project zonder catering: geen lege Groep & wensen-Card
- Deeplink `?focus=status-email`: opent Communicatie-tab i.p.v. te scrollen
- Responsive 1006px (huidige viewport): top-bar wrapt netjes, snel-overzicht 2×2

## Wat expliciet níet verandert

- Geen wijziging aan data, RLS, edge functions, e-mail templates
- Geen wijziging aan Activiteiten/Financiën/Geschiedenis-tabs zelf (alleen toegevoegde Communicatie-tab)
- Alle bestaande dialogs/sheets blijven werken via dezelfde state-vars
