# Funnel Audit — Bureau Vlieland

**Datum:** 9 juni 2026
**Periode geanalyseerd:** mei – begin juni 2026 (30 dagen)
**Scope:** volledige funnel van homepage tot bevestigde aanvraag, inclusief logies-handoff.

---

## 1. Top-line cijfers (30 dagen)

| Metric | Waarde | Observatie |
|---|---|---|
| Bezoekers | 1.960 (~65/dag) | Solide voor niche |
| Pageviews | 4.950 | 2,5 pv/bezoek — laag, weinig diepgang |
| Bounce rate | 66% gemiddeld | **86–90% laatste week** — verdacht (bots NL/CN/Unknown) |
| Programma-aanvragen | 25 totaal | 22 self-service + 3 maatwerk |
| Geannuleerd binnen 25 | **13 (52%)** | Veel ruis — tests of echte afhakers? |
| Logies-aanvragen | **2** | Disproportioneel laag t.o.v. 22 activiteit-aanvragen |
| Actieve projecten uit aanvragen | 9 | ~36% van aanvragen leidt tot doorlopend traject |

---

## 2. Funnel-stadia & lekken (geschat)

```text
Homepage / Landing (610 views)
         │  ~49% klik door
         ▼
Configurator / Snel-aanvragen / Maatwerk
         │  ~7–10% completion
         ▼
Aanvraag verzonden (25)
         │  52% cancelled / 36% wordt project
         ▼
Actief project (9)
         │
         ▼
Logies-handoff (2)  ← grootste lek
```

### Belangrijkste lekken

1. **Bounce-spike laatste 7 dagen (86–90%)**
   Bot-verkeer (CN 291, Unknown 358) drukt het gemiddelde. Echte gebruikers waarschijnlijk minder slecht, maar moet bevestigd worden door bot-filter in GA4.

2. **52% cancellations binnen 25 aanvragen — geclassificeerd 9 jun**
   - **3 echte tests** (Erwin "test", Smoke + Smoke Final op `@example.com`)
   - **6× Jannie Bruggeman** (zelfde mail, 2 pers, in 4 dagen) — **duplicate-submit bug**: gebruiker drukt meermaals op verzenden. Eerste cancel had reden "Datum klopt niet", daarna 5 herhaalde submits. **Dit is het #1 funnel-lek.**
   - **2× van der Velden Interieur** — dubbele aanvraag, één handmatig opgeschoond.
   - **2× legitieme afhaak** (Houtmolen, Amy Jellema) — bureau-side no-response.
   → Echte conversie is **22 - 3 tests - 5 duplicates = 14 unieke aanvragen** op 22 self-service. Beter dan gedacht, maar duplicate-bug moet weg.

3. **Logies-handoff lekt vrijwel volledig (22 → 2)**
   `LogiesSuggestionBanner` op 9 jun prominenter gemaakt (primary kleur, "één partij, één factuur" copy). Effect meten over 2 weken.

4. **BasicsForm vraagt datum + aantal personen vóór inspiratie**
   Klassieke drop-off: bezoeker wil eerst zien wat er kan, niet eerst committen aan datum.

5. **Snel-aanvragen (134 views, lage friction) vs. Programma samenstellen (zware wizard)**
   Positionering is niet duidelijk: wanneer kies je welk pad?

6. **SEO-landingspagina's (heisessie, bedrijfsuitje, etc.) — onbekende conversie**
   345 Google-bezoekers in 30d, maar geen attributie van welke landingspagina naar welke aanvraag.

---

## 3. Prioriteit & aanpak

### Track A — Quick wins (status 9 jun)
- **A1.** ✅ Bot-filter aanbeveling: GA4 Admin → Data Streams → Configure tag settings → "List unwanted referrals"; sluit `country = CN` + `(not set)` uit; activeer Cloudflare Bot Fight Mode op `bureauvlieland.nl`. *Geen code-wijziging, jij doet dit in de dashboards.*
- **A2.** ✅ Cancellations geclassificeerd (zie sectie 2.2). Geen DB-tag nodig bij 13 records.
- **A3.** ✅ `LogiesSuggestionBanner` prominenter (primary kleur, sterkere copy + button).

### Track B — Funnel-friction (1–2 weken)
- **B1.** ✅ BasicsForm: datum optioneel via "Ik weet de datum nog niet — laat me eerst rondkijken". Submit met placeholder-datum (+30d); gebruiker past later aan via edit-dialog.
- **B2.** ✅ Homepage hero: één primaire CTA "Stel uw programma samen". "Programma op maat" gedegradeerd naar subtiele tekstlink eronder ("Liever volledig op maat? Vraag aan").
- **B3.** Snel-aanvragen vs. samensteller: hero-blok met 2 duidelijke routes en doorlooptijd ("3 min" vs "10 min").
- **B4.** **Duplicate-submit guard** op `CheckoutContactForm`: disable knop + spinner tijdens submit, en client-side dedup-hash op `email + dates + cart` in `sessionStorage` (1u TTL). Voorkomt Jannie-scenario.

### Track C — Structureel (langer)
- **C1.** Logies als optionele wizard-stap in plaats van losse flow.
- **C2.** SEO-landingspagina's: track per landing welke conversie volgt; A/B test CTA-copy.
- **C3.** Exit-intent / save-program-as-draft op configurator om afhakers terug te halen (deels al via `useProgramDraft`).

---

## 4. Wat hebben we nu nodig om verder te beslissen

1. **Bot-vrije analytics** — pas dan klopt de bounce-cijfer en kunnen we échte exits per pagina zien.
2. **Classificatie van 13 cancellations** — tests filteren we eruit; echte afhakers krijgen mogelijk een korte feedback-mail.
3. **Akkoord op Track A** als eerste sprint (3 acties, ~1–2 dagen werk).

---

## 5. Open vragen voor de gebruiker

- Mag ik Track A direct implementeren (bot-filter advies + banner-revisie + cancellation-tag)?
- Wil je dat ik per gecancelde aanvraag een kort overzicht maak zodat je ze handmatig kunt classificeren?
- Heb je voorkeur voor de copy/positionering van de logies-banner (subtiel vs. prominent)?
