---
name: social-contentplan
description: Contentpijlers, weekritme en vaste UTM-CTA's voor Facebook en Instagram
type: feature
---

# Social contentplan Bureau Vlieland (Facebook + Instagram)

## Contentpijlers

| Pijler (`utm_content`) | Wat je post | Landingspagina |
|---|---|---|
| `activiteit` | Eén bouwsteen uitgelicht, foto + praktisch feit | `/activiteit/{slug}` (fallback `/bouwstenen`) |
| `voorbeeldprogramma` | Dagindeling als carrousel | `/voorbeeldprogrammas/{slug}` |
| `partner` | Lokale ondernemer, gezicht + verhaal | `/partners` |
| `behind_scenes` | Projectfoto uit de mediabank, zonder klantnamen | `/onze-werkwijze` |
| `eiland` | Agenda, seizoen, wad — zachte content | `/evenementen` |

Bestemmingen zijn per pijler te overschrijven in **Admin → Social → Instellingen**.

## Weekritme

2-3 posts per week (`social_settings.cadence_per_week`), standaard ma/wo/vr om 10:00.

- **Week A**: activiteit → voorbeeldprogramma → partner
- **Week B**: activiteit → behind_scenes → eiland

Eiland-content is de vuller wanneer er geen verse bron is. Dedup: dezelfde bron
(`source_type` + `source_id`) niet binnen 30 dagen opnieuw.

## Caption-stramien

Alle captions: 'je/jullie', max 600 tekens, max 2 emoji, 8-12 hashtags,
geen verzonnen prijzen of datums, zacht eindigen met een uitnodiging.

- **activiteit** — haakje → wat het is → één praktisch feit (duur, groepsgrootte, seizoen) → uitnodiging
- **voorbeeldprogramma** — haakje → dagindeling in 2-3 stappen → voor wie → uitnodiging
- **partner** — persoonlijk detail → wie/wat → waarom wij met ze werken → uitnodiging
- **behind_scenes** — haakje bij de foto → verhaal erachter → wat wij deden → uitnodiging
- **eiland** — haakje over eiland/seizoen → één concreet feit of tip → uitnodiging

## Vaste UTM-CTA's

Standaard op elke link:

```
utm_medium=organic_social
utm_campaign=bureau_vlieland_social
utm_content=<pijler>
utm_term=<slug of bron-id>      (alleen bij een diepe link)
```

- **Facebook**: `utm_source=facebook`, directe diepe link in de caption.
- **Instagram**: `utm_source=instagram`, link naar `/links` (link-in-bio) met
  `?to=<doelpad>`; die pagina stuurt automatisch door en behoudt de UTM's.

De generator (`social-generate-drafts`) bouwt beide URL's en bewaart ze in
`social_posts.ai_raw` (`cta_facebook`, `cta_instagram`).

## Meten

Filter in analytics op `utm_campaign=bureau_vlieland_social`, splits op
`utm_content` (welke pijler werkt) en `utm_term` (welke activiteit of programma).

## Wat we niet doen

Geen automatische publicatie zonder goedkeuring, geen advertenties,
geen klantnamen of prijzen in captions.
