## Doel

De partner-omgeving overzichtelijker maken: één projectgericht overzicht (gesorteerd op datum) i.p.v. tabs met losse items, en een eigen project-pagina (eigen URL) met alle relevante info en acties — in plaats van de huidige zij-sheet.

Volgorde: **eerst** de resterende handmatig-mailen punten uit de vorige chat afmaken, **daarna** pas aan de partner-redesign beginnen.

---

## Fase 1 — Restpunten handmatig mailen afronden

1. **`update-customer-program`** — auto-mail bij wijziging aantal personen ook verwijderen; vervangen door `admin_todo` + interne mail naar `hallo@bureauvlieland.nl`.
2. **Project-annulering handmatig maken** — `cancel-program-request` en het annuleren van losse items vanuit admin: geen auto-fan-out meer naar partners. Bevestigingsdialog krijgt checkbox "Partners informeren" (default uit) of een aparte knop "Partner mailen over annulering" per item.
3. **Granulair "Mail partner"-knoppen** in admin item-popovers (prijswijziging, datawijziging, verwijdering, annulering) — één duidelijke knop per actie, met dezelfde edge-function als nu maar alleen on-demand.
4. Door alle edge-functions lopen voor consistente `block_type === 'bureau'` exclusie (de helper uit vorige beurt overal toepassen).

Geen mailtemplate-wijzigingen tenzij we tegen kapotte verwijzingen aanlopen.

---

## Fase 2 — Partner-omgeving redesign

### Nieuwe routes

- `/partner/dashboard` — projectgericht overzicht (vervangt huidige unified-list met tabs)
- `/partner/project/:projectId` — nieuwe project-pagina (eigen URL, deelbaar, terug-knop)
- Oude item-zij-sheet (`PartnerItemSheet`) wordt niet meer geopend vanuit het overzicht; blijft beschikbaar als embedded blok binnen de project-pagina (of vervangen door inline cards).

`projectId` = `program_request_id` voor activiteiten; voor losse logies-aanvragen `accommodation_request_id` (URL prefix `/partner/logies/:id` om ze te onderscheiden).

### Overzicht (`/partner/dashboard`)

- Eén kaart per project. Per kaart: klantnaam (geanonimiseerd waar nodig), aankomst- en vertrekdatum, aantal personen, korte samenvatting items van die partner (bv. "2 activiteiten · 1 nog te beantwoorden"), statuschip.
- Sortering: chronologisch op aankomstdatum, eerstvolgende bovenaan.
- Drie collapsible secties: **Actie vereist** (open), **Aankomend** (open), **Afgerond / Geannuleerd** (dicht, 3-maanden retentie blijft gelden).
- Logies-aanvragen krijgen ook project-kaarten in dezelfde lijst, met label "Logies".
- Banners (`PartnerActionBanner`, `PartnerChangesSinceBanner`) en stats blijven bovenaan.
- Filter/zoek op klantnaam of datum (lichte versie van bestaande filters).

### Project-pagina (`/partner/project/:id`)

Layout: header + tabs of secties op één pagina (geen sheet meer).

- **Header**: project-titel (datum + klantnaam-display), key-feiten (aankomst, vertrek, aantal personen, dieetwensen, bijzonderheden klant, locatievoorkeuren), terug-knop.
- **Items-blok**: alle items van deze partner binnen dit project, elk een kaart met:
  - status, datum/tijd, aantal, prijs
  - inline acties per item: akkoord, afwijzen, prijs/aantal voorstellen, status-update, factuur uploaden
  - bestaande logica uit `PartnerItemSheet` hergebruiken (componenten extraheren naar herbruikbare blokken: `ItemDetailsCard`, `ItemActionsCard`, `ItemPriceProposal`, etc.).
- **Chat-blok** (project-breed): één thread per project met Bureau Vlieland. Vervangt per-item chats — bestaande chat-tabel krijgt een tweede scope `project_id`/`accommodation_request_id` naast `item_id` (zie technisch onder).
- **Geschiedenis/activiteitenlogboek** onderaan: mails, statuswijzigingen.

### Componenten (refactor)

- `PartnerItemSheet` (1167 regels) opsplitsen in herbruikbare cards die zowel op de nieuwe project-pagina als (eventueel) in een lichtgewicht popover gebruikt kunnen worden.
- `PartnerUnifiedList` vervangen door `PartnerProjectsList` met `PartnerProjectCard`.
- Nieuwe pagina: `src/pages/PartnerProject.tsx`.

### Chat-aanpassing (klein)

Huidige chat is per `item_id`. Voor "één thread per project":
- Nieuwe kolom `chat_messages.scope` (`'item' | 'project' | 'accommodation_request'`) + `scope_id`, of: nieuwe `project_chat_threads`-tabel met `program_request_id` + `partner_id`.
- Voorkeur: minimalistisch — nieuwe kolommen op bestaande `chat_messages` tabel, RLS uitbreiden zodat partners alleen threads zien voor hun eigen items binnen dat project.
- Bestaande per-item berichten blijven leesbaar, gegroepeerd onder de project-thread (oude `item_id`-berichten worden chronologisch ingevoegd).

### Impersonatie

- `?impersonate=<partnerId>` blijft werken op zowel `/partner/dashboard` als `/partner/project/:id` (al verplicht volgens core memory).

### Routes-update in `src/App.tsx`

Nieuwe route toevoegen, oude blijven werken (geen breaking change voor partner-bookmarks; oude per-item URL's zijn er nu niet, dus geen redirect-werk).

---

## Technische notities (Fase 2)

- Geen migratie nodig voor de overzichts-/project-pagina zelf, behalve eventueel de chat-scope kolom.
- Datafetch in `PartnerDashboard` groepeert reeds per `program_request_id` — voornamelijk presentatielaag-werk.
- Project-pagina haalt data via bestaande edge-functions / queries; volledig anonimisering van klant-PII volgens bestaande regel (`bureau_central`).
- Geen wijziging aan mailtriggers in deze fase (die zijn in Fase 1 al handmatig gemaakt).

---

## Buiten scope

- Mobile-app-shell of pushmeldingen.
- Wijzigingen aan logies-detailpagina anders dan inpassen in project-kaartenlijst.
- Wijzigingen aan stats/YTD/financiën-modules.
- Wijzigingen aan klanten-portal of admin-portal (anders dan Fase 1 mail-knoppen).

---

## Uitvoer-volgorde

1. Fase 1 afronden (1 turn).
2. Refactor `PartnerItemSheet` → herbruikbare cards.
3. Bouw `/partner/project/:id` pagina.
4. Vervang overzicht door projectkaarten + sortering op datum.
5. Chat-scope uitbreiden naar project-breed.
6. QA in preview met impersonatie.
