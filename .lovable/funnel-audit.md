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

2. **52% cancellations binnen 25 aanvragen**
   Onbekend of dit testdata is of echte twijfelaars. Eerst classificeren voor we conclusies trekken.

3. **Logies-handoff lekt vrijwel volledig (22 → 2)**
   `LogiesSuggestionBanner` bestaat maar wordt mogelijk te laat / te subtiel getoond. CART_HANDOFF werkt technisch maar wordt niet gebruikt.

4. **BasicsForm vraagt datum + aantal personen vóór inspiratie**
   Klassieke drop-off: bezoeker wil eerst zien wat er kan, niet eerst committen aan datum.

5. **Snel-aanvragen (134 views, lage friction) vs. Programma samenstellen (zware wizard)**
   Positionering is niet duidelijk: wanneer kies je welk pad?

6. **SEO-landingspagina's (heisessie, bedrijfsuitje, etc.) — onbekende conversie**
   345 Google-bezoekers in 30d, maar geen attributie van welke landingspagina naar welke aanvraag.

---

## 3. Prioriteit & aanpak

### Track A — Quick wins (deze week)
- **A1.** Bot-filter in GA4 instellen / Cloudflare-rules; bounce-rate opnieuw meten zonder ruis.
- **A2.** 13 cancellations classificeren in admin: tests vs. echte gebruikers. Tag in DB.
- **A3.** `LogiesSuggestionBanner` zichtbaarder: hoger in scroll, sterker contrast, expliciete copy ("Wij regelen ook uw verblijf — één factuur").

### Track B — Funnel-friction (1–2 weken)
- **B1.** BasicsForm: maak datum optioneel ("Ik weet de datum nog niet — laat me eerst kijken"). Variant zonder datum laadt configurator met placeholder-dagen.
- **B2.** Homepage: één primaire CTA in plaats van twee parallelle. Tweede pad als subtiele tekstlink.
- **B3.** Snel-aanvragen vs. samensteller: hero-blok met 2 duidelijke routes en doorlooptijd ("3 min" vs "10 min").

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
