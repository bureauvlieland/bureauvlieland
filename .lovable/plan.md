## Doel

Elke Facebook- en Instagram-post krijgt een vaste, voorspelbare bestemmingspagina met UTM-tagging, zodat je in analytics per contentsoort ziet wat bezoekers en aanvragen oplevert. Nu bestaat er al UTM-tagging in `social-generate-drafts`, maar de CTA-keuze is een losse fallback-ketting (`default_ctas[source_type] → bouwstenen → default → "/"`) en er is geen inhoudelijke contentkalender.

## 1. Contentpijlers (posttypen)

Vijf vaste pijlers, elk met een eigen doel en landingspagina:

| Pijler | Wat je post | Landingspagina |
|---|---|---|
| Activiteit in de spotlight | één bouwsteen, foto + praktische info | `/activiteit/{slug}`, fallback `/bouwstenen` |
| Voorbeeldprogramma | dag-tot-dag programma als carrousel | `/voorbeeldprogrammas/{slug}` |
| Partner in de spotlight | lokale ondernemer, gezicht + verhaal | `/partners` |
| Achter de schermen / gerealiseerd | projectfoto uit de mediabank | `/onze-werkwijze` |
| Eiland & seizoen (agenda, weer, wad) | zachte content, geen verkoop | `/evenementen` of `/zeehondentochten-vlieland` |

Cadans blijft 2-3 posts per week (bestaande `cadence_per_week`), ritme: activiteit → voorbeeldprogramma → partner/behind-the-scenes, met eiland-content als vuller.

## 2. Vaste UTM-CTA's

Eén centrale mapping in plaats van de huidige fallback-ketting. Standaardparameters blijven `utm_source=meta`, `utm_medium=organic_social`, `utm_campaign=bureau_vlieland_social`, met per post:

- `utm_content` = pijler (`activiteit`, `voorbeeldprogramma`, `partner`, `behind_scenes`, `eiland`)
- `utm_term` = slug/id van de bron, zodat je per activiteit of programma kunt meten

Instagram-posts krijgen geen klikbare link in de caption: die verwijzen naar `/links` (link-in-bio), die pagina krijgt dezelfde UTM-doorgifte naar de onderliggende routes. Facebook krijgt de directe diepe link.

## 3. Wat er in de app verandert

- `social-generate-drafts`: CTA-resolutie vervangen door een expliciete pijler→route-tabel; slug ophalen bij bouwsteen/voorbeeldprogramma zodat de link naar de detailpagina wijst in plaats van het overzicht; `utm_term` toevoegen; per kanaal een aparte CTA (FB = deep link, IG = `/links`).
- Nieuwe bron toevoegen: gepubliceerde voorbeeldprogramma's (nu ontbreekt die als kandidaat-bron), inclusief 30-dagen dedup zoals de andere bronnen.
- `AdminSocialSettings`: het CTA-blok omzetten van vrije key/value naar de vijf pijlers met per pijler een bewerkbare bestemming, plus een read-only voorbeeld van de volledige UTM-URL.
- `/links`: secties uitbreiden met de drie routes + actuele activiteit/voorbeeldprogramma, en UTM's doorzetten naar de doelpagina's.
- Contentkalender als document in het project (`.lovable/social-contentplan.md`) met de pijlers, het weekritme, per pijler een caption-format en de CTA-mapping — zodat AI-generatie én handmatige posts hetzelfde stramien volgen.
- De AI-prompt in `social-generate-drafts` aanvullen met het caption-format per pijler (haakje → verhaal → praktisch feit → zachte uitnodiging), tone-of-voice blijft 'je/jullie'.

## 4. Meten

Geen nieuwe analytics-infrastructuur; de bestaande UTM's zijn genoeg om in je analytics per pijler en per activiteit te filteren. In de admin-social-lijst toon ik bij elke geplaatste post de gebruikte CTA-URL, zodat de koppeling post ↔ meting zichtbaar is.

## Buiten scope

Geen automatische publicatie-wijzigingen (handmatige goedkeuring blijft), geen advertenties, geen per-pagina social preview-afbeeldingen (vereist server-side rendering).
