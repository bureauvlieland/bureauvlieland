
# Verbeterplan klantenpagina (`/programma/:token`)

Doel: het portaal beter laten werken in **twee fases** — vóór het evenement (samenstellen, akkoord) én tijdens het evenement (snel raadplegen, locaties, routes). Daarnaast IA opruimen en processen duidelijker maken.

---

## 1. Informatie-architectuur (navigatie)

Huidig: Overzicht · (Logies) · Programma · Facturatie. Onderdelen als Gasten/dieet, Geschiedenis en Akkoord zitten verstopt in dialogen of onderaan.

Voorgestelde tabs (volgorde = klantreis):

```
Overzicht  ·  Logies*  ·  Programma  ·  Praktisch  ·  Facturatie  ·  Akkoord
                                          (nieuw)                    (nieuw)
```

- **Praktisch** (nieuw): gasten & dieetwensen, kamerindeling, boot/fiets-tickets met PDF, contactpersonen aanbieders, eilandinfo (parkeren, tassenservice, weer), download-PDF & ICS-kalender.
- **Akkoord** (nieuw): aparte tab i.p.v. onderaan Programma — facturatiegegevens-check, voorwaarden, ondertekenen, en ná akkoord de bevestigingsstatus per onderdeel.
- **Facturatie** blijft, maar verschuift naar "factuuroverzicht / betaalstatus" (minder verstopt na akkoord).
- Logies-tab alleen bij meerdaags (ongewijzigd).

Tabs krijgen badges (bv. "2 acties", "nieuwe offerte", "ondertekend ✓") zodat de klant in één blik ziet waar iets te doen is.

## 2. Procesuitleg verduidelijken

- Splash blijft, maar **stappen worden interactief**: huidige stap is gemarkeerd, toekomstige stappen zijn dimmed met "wat gebeurt hier" tooltip.
- Per tab een korte **"Wat kunt u hier doen"-strip** bovenaan (1 regel + uitklap "Meer uitleg") in plaats van losse infokaarten her en der.
- Eén consistente **status-taal** (Te beoordelen / Goedgekeurd / Tegenvoorstel / Bevestigd / Bevestigd & getekend) overal hetzelfde — nu varieert dit tussen splash, items en sidebar.
- "Stille goedkeuring na 7 dagen" uitleggen op de plek waar de timer telt (item-niveau countdown chip), niet alleen in algemene tekst.
- Verwijder dubbele uitleg op splash + program-intro.

## 3. Event-modus (tijdens het verblijf)

Dit is grootste nieuwe stuk. Het portaal werkt al op mobiel maar is gebouwd voor "samenstellen", niet voor "raadplegen onderweg".

### 3a. Automatische schakeling
Vanaf eerste programmadag t/m laatste dag (en als `terms_accepted_at` is gezet) toont het portaal standaard een nieuwe **Vandaag**-weergave i.p.v. de splash.

### 3b. Nieuwe "Vandaag"-tab (tijdens evenement)
- Tijdlijn van de huidige dag, eerstvolgend item bovenaan, "Nu bezig" / "Volgende om 14:00".
- Per item: tijd, locatie (naam + adres), aanbieder met **"Bel"** en **"Routebeschrijving"** knop (deeplink naar Apple/Google Maps), bijzonderheden, contactpersoon.
- Snel-tabs: Vandaag · Morgen · Hele week.
- Bovenin: weer-widget + boot-tijden van de dag (live Doeksen API, bestaat al).

### 3c. Locaties & route
- Nieuwe **Kaart**-sectie binnen Praktisch óf eigen tab "Op het eiland":
  - Leaflet-kaart met alle programmalocaties + logies + bootterminal.
  - Tap op marker → adres, contact, routebeschrijving openen.
- Kaart werkt offline-tolerant (tiles lazy, bij geen netwerk fallback naar adreslijst).

### 3d. Snel-toegang / "Add to Home Screen"
- **Manifest-only PWA** toevoegen (geen service worker, conform projectregels) zodat de klant het portaal als icoon op het beginscherm kan zetten.
- Token in URL blijft de auth-laag — installatie bewaart de gepersonaliseerde URL.
- Op mobiel een eenmalige tip-banner: "Voeg toe aan beginscherm voor snelle toegang tijdens uw verblijf".

### 3e. Mobiele bottom-nav tijdens event
Op mobiel sticky bottom-tabbar (max 4 items): **Vandaag · Programma · Kaart · Contact**. Topbar verbergt de zwaardere tabs (Akkoord/Facturatie staan in een "Meer"-menu).

### 3f. Pull-to-refresh + "laatst bijgewerkt"-stempel
Klanten begrijpen dan dat data live is en hoe ze ververst.

## 4. Kleinere UX-verbeteringen

- **CustomerProgramItem** (uitklapper) heeft nu meer context — verifieer dat dezelfde labels in mobiele dag-cards verschijnen.
- **Sticky CTA op mobiel** verbeteren: nu MobileStickyStatus toont alleen voortgang. Vervang door context-CTA ("Akkoord geven", "Logies kiezen", "Bekijk vandaag").
- **Statusbadges** op tabs (zie §1) i.p.v. losse summary card.
- **Geschiedenis/timeline** verplaatsen naar collapsible onderaan elk relevant item (nu: aparte component die ruimte vraagt).
- **Lege-staten** met duidelijke vervolgactie (bv. "Nog geen logies-offertes — verwacht binnen 2 werkdagen").
- **Splash-fotomozaïek** vervangen door foto's gerelateerd aan het werkelijke programma (categorie-iconen of foto's van geboekte activiteiten) i.p.v. generieke eilandfoto's — meer eigenaarschap.
- **Print/PDF-knop** prominenter in Praktisch-tab.

## 5. Toegankelijkheid & techniek

- Tabbar met `role="tablist"` + keyboard-navigatie (nu losse buttons).
- Focus-states en aria-labels op uitklapbare items.
- Respect `prefers-reduced-motion` voor animaties op splash en cart-pulse.
- Geen service worker (regels), wel `manifest.json` + `display: standalone`.

## 6. Technische impact (kort)

- Nieuwe tabs in `ProgramNavigation.tsx` + view-routing in `CustomerProgram.tsx`.
- Nieuwe componenten:
  - `customer-portal/PracticalView.tsx` (gasten, contacten, downloads, eilandinfo).
  - `customer-portal/TodayView.tsx` (event-modus dagweergave).
  - `customer-portal/ProgramMap.tsx` (Leaflet, hergebruik patroon uit MapActivity).
  - `customer-portal/MobileBottomNav.tsx`.
  - `customer-portal/AcceptView.tsx` (extractie uit huidige Program-view).
- `public/manifest.json` + iconen + meta-tags in `index.html`.
- Hook `useEventMode(program)` die op basis van `selected_dates` bepaalt of we in event-modus zitten.
- Geen DB-wijzigingen verwacht — alle benodigde data bestaat al (locatie, contact, ferry API, accommodatie).

## 7. Voorgestelde uitvoer-volgorde (3 batches)

1. **IA + procesuitleg** (§1, §2, §4 deels) — grootste UX-winst, geen backend.
2. **Event-modus** (§3a–3c, §3e–3f) — Vandaag-tab + Kaart + bottom-nav.
3. **PWA install + polish** (§3d, §5, resterende §4).

---

**Voor ik begin** wil ik graag bevestigd zien:
- Akkoord met opsplitsing in 3 batches (of liever alles in één pass)?
- Nieuwe tab "Praktisch" en aparte "Akkoord"-tab — akkoord met die naamgeving?
- Event-modus automatisch activeren op basis van programmadata, of wil je een handmatige toggle ("Tijdens evenement" knop)?
- PWA: manifest-only (installeerbaar, geen offline) is wat ik aanbeveel — akkoord?
