# Concept & plan: Catering aanvragen

Doel: klanten die **alleen catering** willen (lunch, borrel, BBQ, diner) volledig zelfstandig laten samenstellen en aanvragen, met dezelfde kwaliteit en werkwijze als de programma-flow, maar zonder boot/fiets/dagindeling.

---

## 1. Positionering & instap

- Nieuwe route: **`/catering-aanvragen`** (wizard, noindex onder klantgedeelte zoals andere portals niet — dit is publiek, dus wél indexeerbaar).
- Bestaande **`/catering`** wordt herontworpen rond de wizard:
  - Bovenaan 4 grote keuzetegels (Lunch / Borrel / BBQ / Diner) — elke tegel = directe start van de wizard met dat type voorgeselecteerd.
  - Eronder bestaande content (uitleg, foto's, strand-BBQ-sectie, CTA) als marketingondersteuning.
- Geen tweede CTA-knop in de hoofdnav (eerder besloten). Wel een link in de footer en in het mega-dropdown onder 'Diensten'.

---

## 2. De vier hoofdtypen

| Type | Kerngedachte | Standaard add-ons |
|---|---|---|
| **Lunch** | Broodjes/soep/salade voor groepen vanaf 8 pers. | Koffie/thee-pakket (optie) |
| **Borrel / Receptie** | Hapjes + drankpakket-tiers (basis / uitgebreid / premium) | Statafels (optie) |
| **BBQ (strand of locatie)** | Vlees/vis/vega-arrangement | **BBQ-huur verplicht**, grillmaster + meubilair optioneel |
| **Diner** | 3-gangen, buffet, walking dinner of Vlielandse specialiteiten | Bij externe locatie: servies/bestek/glaswerk + bediening als suggestie |

Daarnaast achter de schermen:
- **Koffie & vergadercatering** als sub-arrangement onder Lunch.
- **Maatwerk-knop** ("Anders / op maat") onderaan de tegelrij → opent een variant van de wizard met vrij omschrijvingsveld i.p.v. arrangementkeuze.

---

## 3. Slimme bundels (regelmotor)

Hardcoded regels die meelopen met de gekozen package:

1. **BBQ → verplichte BBQ-huur** (auto-toegevoegd, verwijderbaar met waarschuwing "een BBQ-arrangement zonder BBQ kunnen we niet uitvoeren") + suggesties grillmaster en statafels/krukken.
2. **Borrel → drankpakket-tier verplicht kiezen** (basis/uitgebreid/premium) + statafels als suggestie.
3. **Diner op externe locatie → servies/bestek/glaswerk + bediening als suggestie** (vraag "is er horeca op locatie?" in stap 1).
4. **Schaalregels op #gasten**: boven configureerbare drempels (bv. 40 pax) automatisch extra bediening suggereren en bij BBQ een grotere set adviseren.

Regels leven als data in de tabel (`required_with`, `suggested_addons`, `scaling_rules` JSONB) — geen losse if-else in code.

---

## 4. Wizard-flow (5 stappen, klassiek)

```text
Stap 1  Wat & wanneer
        ├─ Type (tegels: Lunch / Borrel / BBQ / Diner / Maatwerk)
        ├─ Datum + tijd
        ├─ Locatie (vrij tekstveld, bv. "Strand paal 7" / "Posthuys" / "Eigen accommodatie")
        ├─ Horeca op locatie? (ja/nee) — triggert servies/bediening-suggesties
        └─ Aantal gasten (incl. kinderen split)

Stap 2  Menu / Arrangement
        ├─ Arrangementen filterd op type + groepsgrootte
        ├─ Vanaf-prijs p.p. (incl. BTW) zichtbaar
        └─ Verplichte sub-keuze waar nodig (drankpakket-tier, BBQ-variant)

Stap 3  Extra's
        ├─ Auto-toegevoegde verplichte add-ons (verwijderbaar met warning)
        ├─ Gesuggereerde add-ons als checkbox-cards
        └─ Vrije catalogus (meubilair, personeel, drank, servies)

Stap 4  Wensen & dieet
        ├─ Dieetwensen / allergieën (multi-select + vrij veld)
        ├─ Kinderen + aantallen
        └─ Overige opmerkingen

Stap 5  Contact & verzenden
        ├─ Bedrijf, naam, e-mail, telefoon, factuuradres
        ├─ Indicatieve totaalprijs (incl. BTW) — vanaf-bedragen
        ├─ Soft-warning bij <7 dagen lead-time
        └─ Akkoord voorwaarden + verzenden
```

Tussen alle stappen rechts een **sticky samenvatting** (zoals huidige programma-builder) met live totaal incl. BTW, gekozen items en personenaantal.

---

## 5. Prijslogica & lead-time

- **Indicatieve totaalprijs incl. BTW** zichtbaar in elke stap (conform jullie kernregel).
- Items hebben `unit` (p.p., p.p.p.dagdeel, vast) en `vanaf_prijs`.
- Definitieve prijs altijd in offerte (precies zoals bij programma-aanvragen).
- **Soft-warning bij <7 dagen**: oranje banner "Krappe termijn — we doen ons best, maar kunnen niet garanderen dat alles beschikbaar is." Verzenden blijft mogelijk.
- 10% commissieregel en bureau-central invoicing blijven gelden.

---

## 6. Datamodel — hergebruik `building_blocks`

Op basis van de huidige database (zie sectie 9) blijkt dat er al een rijke set bouwstenen in `building_blocks` staat met `category = 'catering'` (deels `published`, deels `concept`/`active`). We maken **geen aparte `catering_packages`-tabel**, maar breiden `building_blocks` minimaal uit zodat de wizard-logica werkt:

```text
building_blocks  (uitbreiding)
  catering_type     text  (lunch | borrel | bbq | diner | ontbijt | drank | versnapering | addon)  NULL
  catering_role     text  (hoofd | huur | personeel | meubilair | drank | servies | versnapering)  NULL
  required_with     jsonb  (lijst block-ids die auto-toegevoegd worden bij hoofdkeuze)
  suggested_addons  jsonb  (lijst block-ids als suggestie)
  scaling_rules     jsonb  (bv. [{ "min_guests": 40, "suggest": "bediening-diner" }])
```

Filtering in de wizard:
- Stap 2 (hoofdarrangement): `category = 'catering'` AND `catering_role = 'hoofd'` AND `catering_type = <gekozen>` AND `status IN ('active','published')` (concept zichtbaar in admin-preview).
- Stap 3 (add-ons): items met `catering_role IN ('huur','personeel','meubilair','drank','servies','versnapering')`, voorgesorteerd op `required_with`/`suggested_addons` van de gekozen hoofdkeuze + vrije catalogus eronder.

**Aanvragen** opslag via uitbreiding van `program_requests`:
- `request_type` krijgt nieuwe waarde `catering_only`
- Hergebruik `program_request_items` met `day_index = 0` voor alle catering-regels
- Nieuwe optionele kolommen op `program_requests`: `catering_location_text`, `catering_start_time`, `has_horeca_on_site`

**Voordeel**: alle bestaande admin-tooling (projecten-overzicht, communicatie-dossier, partneroffertes, facturatie, partner-portal, ticket-/inkoopkoppeling) werkt direct mee, en bouwstenen blijven óók beschikbaar in de programma-configurator.

---

## 7. Backend / admin

- Admin krijgt onder **/admin/projecten** een filter-chip "Catering" naast bestaande types.
- Project-detail toont catering-aanvragen in een aangepaste weergave (geen dag-tabs, één blok met datum/locatie/items).
- Onder **/admin/bouwstenen** een tweede tab "Catering-arrangementen" voor CRUD op `catering_packages`.
- Aanvraag-verwerking en offerte-mail hergebruiken bestaande edge functions (`send-program-confirmation`, partner-notificaties), met catering-specifieke templates.

---

## 8. Bouwfases

```text
Fase 1 — Datamodel & seeder
  └─ Tabel catering_packages + grants + RLS + seed van eerste arrangementen
     (Lunch x2, Borrel x2, BBQ x2, Diner x2, addons)

Fase 2 — Wizard frontend
  ├─ Route /catering-aanvragen met 5-staps wizard
  ├─ Sticky samenvatting + live prijs incl. BTW
  └─ Regelmotor (required_with / suggested_addons / scaling_rules)

Fase 3 — Submit & opslag
  ├─ Insert in program_requests (type = catering_only) + program_request_items
  ├─ Bevestigingsmail klant + interne notificatie
  └─ Soft-warning lead-time

Fase 4 — /catering pagina herontwerp
  ├─ 4 tegels bovenaan
  ├─ Maatwerk-knop
  └─ Bestaande content herschikt eronder

Fase 5 — Admin
  ├─ CRUD voor catering_packages
  ├─ Project-detail aangepaste view voor catering_only
  └─ Filter-chip in projectenoverzicht
```

---

## 9. Inhoudelijke invulling — bestaande bouwstenen als startset

Hieronder de **echte** items uit `building_blocks` (`category = 'catering'`), gegroepeerd per wizard-type. `[concept]` = nog niet gepubliceerd; `[pub]` = gepubliceerd; `[act]` = active. Alle prijzen p.p. tenzij anders vermeld, incl. BTW.

### Lunch (`catering_type = 'lunch'`)
**Hoofd-arrangementen**
- `luxe-lunch` — Luxe Lunchbuffet — Zuiver — € 32,00 p.p. — 15–80 pax — [pub]
- `lunch-strand` — Lunch op locatie — Zuiver — € 25,00 p.p. — [pub]
- `ontbijt-op-locatie` — Ontbijt op locatie — Zuiver — € 28,00 p.p. — vanaf 8 pax — [pub] *(sub-type ontbijt)*
- `lunch-aan-boord-bij-rederij-doeksen` — Lunch aan boord — Rederij Doeksen — € 14,95 p.p. — [pub]
- `doeksen-plate-nasi-kopie` — Plateservice aan boord — Rederij Doeksen — vanaf € 14,95 p.p. — [pub]
- `doeksen-lunchbuffet` — Lunchbuffet aan boord — € 22,95 p.p. — vanaf 25 pax — [concept]
- `doeksen-lunchpakket` — Lunchpakket (to-go) aan boord — € 14,95 p.p. — vanaf 10 pax — [concept]
- `doeksen-brunchbuffet` — Brunchbuffet aan boord — € 34,95 p.p. — vanaf 25 pax — [concept]
- `doeksen-ontbijt` — Ontbijt aan boord — € 15,50 p.p. — vanaf 10 pax — [concept]
- `doeksen-ontbijtbuffet` — Ontbijtbuffet aan boord — € 17,50 p.p. — vanaf 25 pax — [concept]
- `doeksen-lunch-vuurduin` — Vuurduin lunch — € 14,95 p.p. — vanaf 10 pax — [concept]
- `doeksen-lunch-wadloper` — Vega Wadloper lunch — € 14,95 p.p. — vanaf 10 pax — [concept]
- `doeksen-lunch-strandjutter` — Strandjutter lunch — € 16,95 p.p. — vanaf 10 pax — [concept]

### Borrel / Receptie (`catering_type = 'borrel'`)
**Hoofd-arrangementen**
- `borrel` — Borrel & Hapjes — Zuiver — vanaf € 45,00 p.p. — 15–150 pax, 2,5u — [pub]
- `borrelplank` — Borrelplank — Bureau — € 7,75 p.p. — [act] *(als hapjes-add-on bij eigen borrel)*
- `koffie-gebak-boot` — Koffie & Gebak aan boord — € 7,75 p.p. — [pub] *(versnapering)*

**Verplicht te kiezen drankpakket-tier** (nu nog individuele losse items — voorstel: 3 nieuwe `tier`-bouwstenen 'Drank basis/uitgebreid/premium' bouwen die intern verwijzen naar onderstaande als nacalculatie):
- `drank-stelpost-avond` — Drank stelpost 18:00–23:00 — Bureau — € 8.000 totaal (nacalculatie) — [act]
- `drankafkoop-avond` — Drankafkoop — Bureau — € 8.076,75 totaal — [act]
- Losse drank: `bubbels-fles` € 23,50 · `wijn-wit-fles` € 16,75 · `bier-heineken` € 2,75 · `bier-fortuna-bries` € 4,25 · `frisdrank-groot` € 7,50 · `water-chaudfontaine` € 5,00 — [act]
- `taart-pp` — Taart per persoon — € 4,00 — [act]

### BBQ (`catering_type = 'bbq'`)
**Hoofd-arrangementen**
- `strand-bbq` — Outdoor Cooking (strand) — Zuiver — € 35,00 p.p. — 20–100 pax, 3u — [pub]
- `catering-burger-festival` — Build Your Own Burger Festival — Zuiver — € 12.507,75 totaal — [act]

**Verplichte / suggested add-ons** (`required_with` / `suggested_addons`)
- `grillmaster-zuiver-traiteur` — Grillmaster Zuiver — € 195,00 voor 3u — [pub] *(suggested)*
- ⚠️ Een expliciet "BBQ-huur" bouwsteen ontbreekt nog in de database — **moet toegevoegd worden** (bv. `bbq-huur-set`) en aan `strand-bbq.required_with` gekoppeld.
- Statafels / krukken / tent: ontbreken in `category='catering'` — wellicht onder `category='locaties'` of nieuw aanmaken.

### Diner (`catering_type = 'diner'`)
**Hoofd-arrangementen**
- `diner-zeezicht` — Diner Restaurant Zeezicht — € 39,50 p.p. — [pub]
- `italian-shared-dining` — Italiaanse shared dining @ Oliva — € 44,50 p.p. — vanaf 10 pax — [pub]
- `regina-andrea-prive-terug` — Privévaart Regina Andrea incl. warm buffet — Op aanvraag — vanaf 30 pax — [pub] *(category=vervoer, eventueel cross-listen)*
- `catering-3-gangen-diner` — Zuiver Traiteur 3-gangen diner — € 14.633,25 totaal — [pub]
- `3-gangen-diner` — 3 gangen diner (stelpost) — € 40,00 p.p. — [act]
- `sunset-dinner` — Sunset Dinner — Zuiver — € 65,00 p.p. — 20–50 pax, 2,5u — [concept]
- `doeksen-buffet-doeksen` — Doeksen buffet — € 37,95 p.p. — vanaf 25 pax — [concept]
- `doeksen-buffet-italiaans` — Italiaans buffet — € 29,95 p.p. — vanaf 25 pax — [concept]
- `doeksen-buffet-sate` — Saté buffet — € 27,95 p.p. — vanaf 25 pax — [concept]
- `doeksen-buffet-captains` — Captain's dinner buffet — € 24,95 p.p. — vanaf 25 pax — [concept]
- Doekies plates (vanaf 10 pax, [concept]): `doeksen-plate-hamburger` € 14,95 · `doeksen-plate-nasi` € 16,95 · `doeksen-plate-pasta` € 16,95 · `doeksen-plate-spareribs` € 16,95 · `doeksen-plate-curry` € 16,95
- Snacks: `doeksen-frites-groot` € 8,50 · `doeksen-frites-middel` € 7,50 — [concept]

**Suggested add-ons bij diner op externe locatie / geen horeca**
- `bediening-diner` — Bediening diner (stelpost) — € 2.420 totaal — [act, category=services]
- (Servies/bestek/glaswerk-bouwstenen ontbreken nog — voorstel toevoegen of als tekstuele optie aanvinken.)

### Overige / cross-cutting
- `koffiebar-omzetgarantie` — Koffiebar omzetgarantie — € 907,50 totaal — [act] *(extra optie bij dagprogramma)*

---

## 9b. Eerste regels voor `required_with` / `suggested_addons`

```text
strand-bbq:
  required_with:    [<nieuw: bbq-huur-set>]
  suggested_addons: [grillmaster-zuiver-traiteur, borrelplank]
  scaling_rules:    [{ "min_guests": 40, "suggest": "grillmaster-zuiver-traiteur" }]

borrel:
  required_with:    []   (drank-tier verplicht via wizard-radio, niet via required_with)
  suggested_addons: [borrelplank, taart-pp, bubbels-fles]

diner-zeezicht / italian-shared-dining / sunset-dinner:
  suggested_addons: [] (horeca op locatie)

catering-3-gangen-diner / 3-gangen-diner / doeksen-buffet-*:
  suggested_addons: [bediening-diner]
  scaling_rules:    [{ "min_guests": 60, "suggest": "bediening-diner" }]

luxe-lunch / ontbijt-op-locatie:
  suggested_addons: [koffiebar-omzetgarantie]
```

---

## 10. Open punten om in vervolgsessie af te tikken

- **Ontbrekende bouwstenen toevoegen**: `bbq-huur-set` (verplicht bij BBQ), statafels/krukken/tent, servies/bestek/glaswerk-set, en 3 drank-tier-bouwstenen (basis / uitgebreid / premium) met vaste vanaf-prijs i.p.v. enkel nacalculatie.
- **Concept-status doorlopen**: alle `[concept]` Doeksen-items met Doeksen afstemmen en op `active`/`published` zetten waar gewenst voor wizard-zichtbaarheid.
- **Foto's per arrangement**: bestaande items hebben deels geen `image_url`/`image_asset`. Wizard wordt veel sterker met consistente beeldtaal — bestaande assets matchen of nieuwe shoot inplannen.
- **Drempels schaalregels** definitief: bij hoeveel pax extra bediening, grotere BBQ-set, tweede grillmaster?
- **Lead-time soft-warning**: exacte tekst en standaard (7 dagen? 14 voor BBQ/diner?).
- **SEO**: keywords voor `/catering` ("catering vlieland", "bbq strand vlieland", "bedrijfscatering vlieland", "ontbijt op locatie vlieland"...).

---

**Voorstel volgorde**: na akkoord op dit concept eerst Fase 1 (datamodel + seed met dummy-prijzen) en Fase 2 (wizard skeleton) bouwen zodat je het kunt klikken. Daarna inhoud (prijzen, teksten, foto's) finaliseren en Fase 3-5 doorrollen.
