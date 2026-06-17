# Plan: A → C (SEO quick wins, dan Social live)

## Stap A — Semrush SEO-scan + quick-win actielijst

**Doel:** in één sessie een feitelijk beeld van waar bureauvlieland.nl staat in Google, wat de grootste kansen zijn, en een concrete top-10 actielijst die ik daarna kan uitvoeren.

**Wat ik doe (read-only, geen code-wijzigingen):**

1. **Domein-snapshot** via Semrush op `bureauvlieland.nl` (database `nl`):
   - Geschatte organisch verkeer, aantal rankende keywords, Authority Score, trend laatste 12 maanden.
2. **Top pagina's** — welke URL's brengen nu het verkeer binnen, en welke landingspagina's blijven achter ondanks dat ze er wél zijn (bv. `heisessie-vlieland`, `incentive-reis-vlieland`).
3. **Keyword-posities** — keywords waar we op pagina 2 staan (positie 11–20): dit is de snelste winst, want kleine on-page verbeteringen tillen die naar pagina 1.
4. **Concurrentie-analyse** — wie ranked op onze kernkeywords ("bedrijfsuitje Vlieland", "teamuitje Vlieland", "vergaderen Vlieland", "groepsweekend Vlieland"), en welke keywords hebben zij wel waar wij niets mee doen (keyword gap).
5. **Interne SEO-scan** via de ingebouwde SEO-review op het project: titles, meta descriptions, canonicals, H1's, schema, alt-teksten, interne links.
6. **Google Search Console check** — als er een verificatie ontbreekt of de site nog niet aangemeld is, signaleer ik dat (en kan ik dat in stap B oplossen).

**Wat je terugkrijgt:**

Een korte rapportage in chat met:
- Huidige stand (1 alinea, geen jargondump)
- Top 10 quick wins, gerangschikt op impact/inspanning, bv:
  - "Pagina X staat op positie 12 voor [keyword] met 480 zoekopdrachten/mnd — title herschrijven + 2 interne links toevoegen = realistisch positie 5–8"
  - "Landingspagina Y mist FAQ-schema — toevoegen geeft rich results"
  - "Geen pagina voor [keyword met X zoekopdrachten] terwijl concurrent Z erop rankt — nieuwe landingspagina maken"
- Welke acties ik direct zelf kan uitvoeren (code/copy), welke jouw input nodig hebben (bv. tekstkeuzes, USP's), en welke een vervolgsessie zijn (nieuwe content).

**Doorlooptijd:** ±30 min onderzoek + rapportage. Daarna besluit jij per actie of ik 'm uitvoer.

---

## Stap C — Social media publisher live

**Voorwaarde:** je hebt een Facebook + Instagram **Business**-account (Instagram moet professional/business zijn, gekoppeld aan een Facebook Page). Een persoonlijk IG-account werkt niet via de Meta Graph API.

**Wat ik doe:**

1. **Meta App configureren** — controleren of `META_APP_ID` en `META_APP_SECRET` als secrets in het project staan. Zo niet: ik vraag ze aan jou (eenmalig aanmaken in developers.facebook.com, kost ~10 min).
2. **OAuth-koppeling** — via de bestaande edge function `social-meta-oauth-start` koppel je in de admin (`/admin/social-settings`) je Facebook Page + IG-account. De long-lived token (~60 dagen) wordt versleuteld opgeslagen.
3. **Cadence-instellingen** afstemmen: standaard 2–3 posts/week. We zetten 'm eerst op **conceptmodus** (`publishing_enabled=false`) — dan genereert de AI wel concepten, maar publiceert nog niets. Jij keurt de eerste 1–2 weken handmatig goed voor je 'm losgooit.
4. **Eerste batch concepten** — ik draai `social-generate-drafts` eenmalig handmatig om 3–5 concepten te laten genereren uit:
   - Recente building blocks
   - Mediabank-uploads
   - Partners-in-de-spotlight rotatie
5. **Inplannen + ritme** — samen kiezen we vaste momenten (bv. di/do/za 10:00). De edge function `social-publish` publiceert op de geplande tijd zodra `publishing_enabled=true`.

**Wat je terugkrijgt:**

Een werkend `/admin/social` overzicht met concepten → goedkeuren → inplannen → automatisch publiceren naar FB + IG. Inclusief PII-scrub (geen klantnamen) en geen verzonnen prijzen/datums in captions.

**Doorlooptijd:** ±20 min als Meta App al bestaat, ±45 min als we 'm nog moeten aanmaken.

---

## Vragen voordat we starten

1. **Search Console** — heeft `bureauvlieland.nl` al een geverifieerde Google Search Console property? (Zo niet, voeg ik dat in stap A toe — gratis, geeft veel betere data.)
2. **Meta Business** — bestaat er al een Facebook Page voor Bureau Vlieland met een gekoppeld Instagram Business-account? (Bepaalt of stap C 20 of 45 min duurt.)
3. **Stap A nu starten?** — zeg "ja" en ik begin direct met de scan.
