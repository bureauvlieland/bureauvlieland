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

## 9. Inhoudelijke voorstellen (om mee verder te puzzelen)

Concrete arrangementen die ik wil voorstellen als startset (definitieve namen + prijzen vul je in):

**Lunch**
- *Vlielandse lunch standaard* — broodjes, soep, fruit, koffie/thee
- *Lunch luxe* — uitgebreid buffet met warme component

**Borrel**
- *Borrel basis* — hapjes + bier/wijn/fris
- *Borrel uitgebreid* — warme + koude hapjes + premium drankpakket
- *Walking dinner borrel* — 5 hapjesrondes als mini-diner

**BBQ**
- *Strand-BBQ klassiek* — vlees/vis/vega, salades, brood (verplicht: BBQ-huur)
- *BBQ luxe* — uitgebreid + dessert
- Add-ons: grillmaster, statafels, krukken, tent

**Diner**
- *3-gangen Vlielands* — lokale producten
- *Buffet* — koud/warm
- *Walking dinner*
- Add-ons (bij geen horeca): servies, bestek, glaswerk, bediening

**Vergader / koffie**
- *Koffie-arrangement* — koffie/thee + zoet
- *Vergaderlunch* — broodjes + soep + water

---

## 10. Open punten om in vervolgsessie af te tikken

- Definitieve prijzen vanaf-bedragen per arrangement (komen van Zuiver Traiteur)
- Foto's: bestaande catering-assets hergebruiken of nieuwe shoot?
- Tiers drankpakket: exact wat zit erin per niveau?
- Drempels schaalregels: bij hoeveel gasten extra bediening / grotere BBQ?
- Lead-time soft-warning: tekst exact uitschrijven
- SEO: keywords voor /catering ("catering vlieland", "bbq strand vlieland", "bedrijfscatering vlieland"...)

---

**Voorstel volgorde**: na akkoord op dit concept eerst Fase 1 (datamodel + seed met dummy-prijzen) en Fase 2 (wizard skeleton) bouwen zodat je het kunt klikken. Daarna inhoud (prijzen, teksten, foto's) finaliseren en Fase 3-5 doorrollen.
