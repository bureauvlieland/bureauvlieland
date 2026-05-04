# Klant-akkoord op de klantpagina: bug + workflow opnieuw ontwerpen

## Wat is er aan de hand?

Drie problemen, allemaal veroorzaakt door dezelfde architectuur-keuze (akkoord-knop afhankelijk van `program_type === "quote"`).

### 1. Bug: BV-2602-0004 toont géén akkoord-knop
- BV-2602-0004 staat op `program_type = "quote"` en `quote_status = "offerte_verstuurd"` — dat zou de akkoord-kaart (`AcceptQuoteProposalCard`) moeten tonen.
- De kaart wordt wél gemonteerd, maar er is **geen `quote_pdf_path`** in de database. De klant ziet dus de knop "Akkoord, start reserveringen" zonder bijbehorende offerte/PDF om te beoordelen → onlogisch en daarom blijkbaar nooit ingedrukt.
- Bovendien zegt de status-checklist *"Wachten op aanbieders (0/11 bevestigd)"* terwijl er feitelijk wordt gewacht op de klant. De screenshot bevestigt dit.

### 2. Bug: alle "self_service" en "maatwerk" projecten missen de akkoord-kaart volledig
- Audit van alle lopende projecten met `quote_status = "offerte_verstuurd"`:

| Referentie | program_type | Quote PDF? | Akkoord mogelijk? |
|---|---|---|---|
| BV-2602-0002 | quote | ja | ja (knop zichtbaar) |
| BV-2602-0003 | quote | nee | knop zichtbaar maar geen PDF |
| **BV-2602-0004** | **quote** | **nee** | **knop zichtbaar maar geen PDF** |
| BV-2603-0007 | quote | ja | ja |
| BV-2604-0004 | quote | nee | knop maar geen PDF |
| BV-2603-0016 | self_service | ja | **nee — kaart rendert niet** |
| BV-2603-0018 | self_service | ja | **nee** |
| BV-2604-0003 | self_service | ja | **nee** |
| BV-2604-0006 | self_service | ja | **nee** |
| BV-2603-0003 | maatwerk_zakelijk | nee | **nee — kaart rendert niet** |

Bij `self_service` en `maatwerk_*` is in de admin keurig een offerte-PDF gegenereerd en `quote_status = offerte_verstuurd` gezet, maar `AcceptQuoteProposalCard` blokkeert op regel 22 (`if (program.program_type !== "quote") return null;`). Resultaat: klant kan nooit akkoord geven, partners worden nooit aangevraagd, project zit muurvast.

### 3. Toon en zwaarte van het akkoord
Huidige tekst op de knop: *"Akkoord, start reserveringen"* + *"Door akkoord te gaan bevestigt u de prijs en details"*. Dat klopt niet bij de daadwerkelijke flow:
- Op dit moment is het slechts een **programmavoorstel met voorlopige prijzen**.
- Pas ná dit akkoord vragen we de partners om beschikbaarheid; daarna komen er definitieve bevestigingen of tegenvoorstellen, en pas helemaal aan het eind tekent de klant de **AV**.
- De huidige formulering doet de klant aarzelen ("ik zit er aan vast") en is ook strikt genomen onjuist (er is nog geen partnerbevestiging).

## Voorstel: drie reparaties + workflow-herijking

### A. Fix de bug — akkoord-kaart altijd tonen bij offerte_verstuurd
Verwijder de `program_type === "quote"`-check uit `AcceptQuoteProposalCard`. Toon de kaart bij **élk** project waar:
- `quote_status === "offerte_verstuurd"` EN
- `terms_accepted_at IS NULL` (anders is het project verder in de flow) EN
- er minstens één niet-geannuleerd, niet-bureau item is.

Dit dekt `quote`, `self_service`, `maatwerk_zakelijk`, `maatwerk_familie`, etc. in één klap.

### B. Toon de PDF-offerte prominent op de klantpagina
- `get-customer-program` levert `quote_pdf_url` al aan (signed URL, 1u geldig). Op desktop staat er nu alleen een onopvallend knopje (zie `DesktopProgramView.tsx:319`).
- Nieuwe **"Offerte"-card** bovenaan de programma-tab tonen wanneer `quote_pdf_url` aanwezig is: titel "Uw offerte", subtitle "Verzonden op {datum}, geldig tot {datum}", grote knop **"Offerte bekijken (PDF)"** + secundaire knop **"Downloaden"**.
- Geen PDF? Dan toont de kaart i.p.v. PDF-knop een nette tekst: *"Bekijk hieronder het programmavoorstel met indicatieve prijzen."*

### C. Herformuleer het akkoord — laagdrempelig
Pas tekst en framing van `AcceptQuoteProposalCard` aan. Concept:

```
┌─────────────────────────────────────────────────────┐
│  Programmavoorstel met indicatieve prijzen          │
│  ───                                                │
│  Dit is een voorstel — nog géén definitieve boeking. │
│  Geeft u akkoord, dan vragen wij voor u bij elke    │
│  aanbieder beschikbaarheid en bevestiging op.       │
│  U beslist later definitief, na de AV-ondertekening.│
│                                                     │
│  Wat gebeurt er na uw akkoord?                      │
│  1. Wij benaderen alle aanbieders                   │
│  2. U ziet hier per onderdeel de bevestiging        │
│  3. Pas bij ondertekenen AV is alles definitief     │
│                                                     │
│  [ Bekijk offerte (PDF) ]   [ Akkoord, vraag aan ] │
│                                                     │
│  Niet bindend — u kunt nog altijd wijzigen          │
└─────────────────────────────────────────────────────┘
```

- Knop-tekst: **"Akkoord — vraag beschikbaarheid op"** (i.p.v. "start reserveringen").
- Disclaimer onder de knop: *"Niet-bindend voorstel. Definitieve boeking volgt pas na ondertekening van de algemene voorwaarden."*
- Bij `quote_valid_until` blijft de "Geldig tot"-badge zichtbaar.

### D. Fix de status-checklist labels
In `StatusSummary.tsx` (variant `checklist`):
- Zolang `quote_status === "offerte_verstuurd"` en `terms_accepted_at` leeg is, label "Programma" wordt: **"Wachten op uw akkoord ({n} onderdelen)"** met blauw/info-icoon, niet "Wachten op aanbieders".
- Pas wanneer `quote_status` op `akkoord_ontvangen` staat schakelt het label door naar **"Wachten op aanbieders"**.
- "Uw akkoord"-rij: bij `offerte_verstuurd` zonder per-item-akkoord tonen als één enkele actie: "Voorstel beoordelen" → "Voorstel akkoord ✓".

### E. Eenmalige actie: 4 vastgelopen projecten
Voor BV-2602-0003, BV-2602-0004, BV-2604-0004, BV-2603-0003 ontbreekt een PDF. Twee opties:
1. **Admin notify**: maak een admin-todo "Offerte-PDF ontbreekt — alsnog genereren en versturen" voor deze 4 projecten.
2. **Niets doen**: na fix A kan de klant ook zónder PDF akkoord geven (kaart toont dan beschrijvende tekst i.p.v. PDF-knop). Workflow loopt door.

Voorkeur: **beide** — fix in code + admin-todo zodat Bureau bewust kan kiezen alsnog een PDF te sturen.

## Technische impact

- `src/components/customer-portal/AcceptQuoteProposalCard.tsx` — herschrijf condities + UI.
- `src/components/customer-portal/StatusSummary.tsx` — labels/iconen voor "Programma"-rij contextueel maken.
- Nieuwe `src/components/customer-portal/QuotePdfCard.tsx` — prominente PDF-presentatie.
- `src/components/customer-portal/DesktopProgramView.tsx` + `MobileProgramView.tsx` — `QuotePdfCard` integreren bovenaan, oude inline-knop weghalen, condities voor `AcceptQuoteProposalCard` aanpassen.
- Eenmalig SQL/edge-function: 4 admin-todos aanmaken voor de PDF-loze projecten (insert-only via migratie).
- Geen DB-schema wijzigingen.

## Wat ik daarna ga bouwen (in build mode)

1. AcceptQuoteProposalCard herschrijven (fix A + tekst C).
2. QuotePdfCard maken en integreren (B).
3. StatusSummary labels herzien (D).
4. Admin-todos aanmaken voor de 4 PDF-loze projecten (E).
5. Visueel verifiëren via klantportaal-token van BV-2602-0004 en BV-2603-0016 (een `quote`- en een `self_service`-project).

Goed om door te gaan?
