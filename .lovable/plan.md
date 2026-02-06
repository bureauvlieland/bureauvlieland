

# Template Katalys aanmaken

## Wat verandert er ten opzichte van het vorige plan?

- Partner "Stichting Natuur Educatie Centrum Vlieland" bestaat al (ID: `stichting-natuur-educatie-cent`) -- wordt NIET opnieuw aangemaakt
- Stap 1 (partner aanmaken) vervalt volledig

## Stap 1: Twee nieuwe bouwstenen aanmaken

| Bouwsteen | ID | Categorie | Partner ID |
|-----------|-----|-----------|-----------|
| Wadloopexcursie | `wadloopexcursie` | excursies | `stichting-natuur-educatie-cent` |
| Paardrijden | `paardrijden` | outdoor | `manege-de-seeruyter` |

Beide starten als unpublished zonder prijzen.

## Stap 2: Template "Katalys" aanmaken (3 dagen, 11 items)

| Dag | Tijd | Activiteit | Bouwsteen |
|-----|------|-----------|-----------|
| 1 | 13:30 | Vertrek naar Vlieland | `boot-retour` |
| 1 | 15:45 | Fietsen ophalen | `fiets-huur` |
| 1 | 16:30 | Strandspektakel | `strandspektakel` |
| 1 | 18:00 | BBQ | `strand-bbq` |
| 2 | 10:00 | Wadloopexcursie | `wadloopexcursie` (nieuw) |
| 2 | 12:00 | Lunch bij bunkermuseum | `luncharrangement` |
| 2 | 13:30 | Paardrijden | `paardrijden` (nieuw) |
| 2 | 17:30 | Diner | `catering-3-gangen-diner` |
| 2 | 19:30 | Lasergamen | `voc-lasergamen` |
| 3 | 09:30 | Zeehondentocht | `zeehondentocht` |
| 3 | 11:30 | Vertrek veerboot | `boot-retour` |

## Technische details

Drie SQL operaties:

1. **Bouwsteen wadloopexcursie**: `INSERT INTO building_blocks` met `provider_id = 'stichting-natuur-educatie-cent'`, categorie `excursies`
2. **Bouwsteen paardrijden**: `INSERT INTO building_blocks` met `provider_id = 'manege-de-seeruyter'`, categorie `outdoor`
3. **Template + 11 items**: `INSERT INTO program_templates` (ID: `katalys`, naam: "Katalys", 3 dagen, unpublished) en `INSERT INTO program_template_items` met alle 11 regels

