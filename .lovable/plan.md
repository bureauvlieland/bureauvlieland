
## Probleem

In de klantportaal-statuskaart lopen drie verschillende soorten "akkoord" door elkaar:

1. **Akkoord op het voorstel** (offerte als geheel) — `quote_status: offerte_verstuurd → akkoord_ontvangen`.
2. **Goedkeuring per onderdeel** dat een partner heeft bevestigd — `item.customer_approved_at` per regel.
3. **Akkoord op de algemene voorwaarden** — `terms_accepted_at`, juridisch sluitstuk.

De huidige verticale lijst ("Wachten op aanbieders 0/8 bevestigd / Uw akkoord 5 van 8 geaccordeerd / …") suggereert losse parallelle dingen. Klanten en partners ervaren het als onduidelijk.

## Oplossing

Eén **horizontale stepper** bovenaan de klantpagina, met consistente terminologie. Alleen klantkant in deze iteratie; partnerportal volgt later.

## Stappen (klantkant)

```text
①─────────②──────────③──────────④
Logies    Aanbieders  Goedkeuren  Gegevens
kiezen *  bevestigen              & voorwaarden
```
\* Stap 1 alleen tonen bij meerdaagse projecten.

| # | Titel                       | "Actief" wanneer                                                                       | "Klaar" wanneer                                                | Wie     |
|---|-----------------------------|----------------------------------------------------------------------------------------|----------------------------------------------------------------|---------|
| 1 | **Logies kiezen** *(multi-day)* | logies-aanvraag loopt of offertes binnen                                              | een offerte heeft `status = selected`                          | Klant   |
| 2 | **Aanbieders bevestigen**   | items op `pending` / `alternative` / `counter_proposed`                                | alle niet-cancelled items zijn `confirmed`                     | Partners|
| 3 | **Onderdelen goedkeuren**   | er zijn `confirmed` items zonder `customer_approved_at` (telt door: "3 van 8 goedgekeurd") | `customerApprovedCount ≥ customerApprovableCount` én voorstel-akkoord gegeven | **Klant** |
| 4 | **Gegevens & voorwaarden**  | stap 3 klaar én (`billingComplete` = false óf `terms_accepted_at` = null)              | beide compleet → eindstaat "✓ Klaar — wij gaan het regelen"    | **Klant** |

Stap 1 (voorstel ontvangen) vervalt: zodra de klant op de pagina is, is die per definitie "done", dus voegt visueel niets toe. Stap 4 bundelt facturatiegegevens + voorwaarden tot één laatste klant-actie, omdat ze altijd samen worden afgerond op het ondertekenscherm.

## Terminologie (consistent in UI én e-mails)

| Oud / verwarrend                              | Nieuw                                          |
|-----------------------------------------------|------------------------------------------------|
| "Wachten op aanbieders (0/8 bevestigd)"       | Stap 2 — **Aanbieders bevestigen** (0/8)       |
| "Uw akkoord — 5 van 8 geaccordeerd"           | Stap 3 — **Onderdelen goedkeuren** (5/8)       |
| "Voorstel akkoord" / "Alle onderdelen geaccordeerd" | één term: **goedgekeurd**                |
| "Facturatie — gegevens aanleveren"            | Stap 4 — **Gegevens & voorwaarden**            |
| "Voorwaarden — nog accepteren"                | onderdeel van stap 4                           |
| Eindstaat                                     | **✓ Klaar — wij gaan het regelen**             |

Microcopy-regel: **"bevestigd"** = wat de aanbieder doet (`item.status=confirmed`). **"goedgekeurd"** = wat de klant doet (`customer_approved_at`). Nooit door elkaar gebruiken.

## Visueel ontwerp

**Desktop / tablet (horizontaal):**
- Stepper full-width in de status-kaart bovenaan.
- Per stap: bolletje (24px) + korte titel + 1 regel microtekst eronder.
- Connector-lijn tussen bolletjes vult zich naarmate stap "done" wordt.
- Drie staten:
  - **done** — gevuld primary, check-icoon.
  - **active** — outline primary + ring, evt. zachte pulse; subtitel toont concrete CTA-tekst ("3 van 8 nog goedkeuren").
  - **upcoming** — outline muted.
- Eronder één regel + (indien klant aan zet) primaire knop die naar de juiste sectie scrollt.

**Mobiel (compact, scroll-vrij):**
- Eén regel: `Stap 3 van 4 · Onderdelen goedkeuren`.
- Daaronder een mini-stripe van 4 bolletjes (alleen visueel, geen labels) als voortgang.
- Subtitel: actie + voortgangsteller (bijv. "3 van 8 goedgekeurd").
- Eén primaire CTA-knop naar de actieve sectie.
- Tikken op de mini-stripe opent een uitklap met alle 4 stappen + labels (zelfde info als desktop), zodat de context behouden blijft zonder horizontaal scrollen.

Drie staten gebruiken bestaande design-tokens (primary / muted / border). Geen nieuwe kleuren.

## Scope

- **Alleen klantkant.** Partnerportal in vervolgstap.
- Geen wijzigingen in database, RLS, edge functions of business-logica — puur presentatie + copy.
- Bestaande `StatusSummary` `default` en `compact` blijven werken; `checklist`-variant wordt vervangen door de nieuwe stepper en uitgefaseerd.

## Technisch

- Nieuwe component `src/components/customer-portal/ProgramStepper.tsx`.
- Reine helper `getProgramSteps(props): Step[]` (`{ id, label, sub, state, ctaHref? }`) — unit-testbaar, los van rendering.
- Inputs gelijk aan huidige `checklist`-variant props (statusSummary, billingComplete, termsAccepted, quoteStatus, customerApproved/ApprovableCount, accommodationStatus, isMultiDay).
- Mobiele compact-weergave + uitklap in dezelfde component, geschakeld via `useIsMobile()` / Tailwind `sm:`-breakpoint.
- Callers omzetten (in deze volgorde):
  1. `DesktopProgramView` + `MobileProgramView` (hoofdgebruik bovenaan portaal).
  2. `ProgramSidebar` (sticky context — daar tonen we de **compacte** variant zoals op mobiel).
  3. `CustomerPortalSplash` "Hoe werkt het traject?" — uitlijnen met dezelfde 4 stappen en labels, zodat splash en stepper hetzelfde verhaal vertellen.
- Mini-glossary tooltip ("?"-icoon naast de kaarttitel) met één zin per akkoord-soort, voor klanten die meer context willen.

## Vervolg (buiten scope nu)

- Partnerportal-stepper (Aangevraagd → Geoffreerd → Goedgekeurd door klant → Uitgevoerd → Gefactureerd).
- E-mailtemplates herzien op nieuwe terminologie ("bevestigd" vs "goedgekeurd").
