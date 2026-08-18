# Tijdsduur zichtbaar bij de activiteit in de partnerportal

## Doel
Partners moeten bij een onderdeel direct zien hoe lang de activiteit duurt (en tot hoe laat die dan loopt), zodat ze hun planning erop kunnen afstemmen.

## Wat er verandert

1. **Omschrijvingsblok in het onderdeel-venster**
   Boven de omschrijving komt een compacte regel met datum, starttijd en duur, bijvoorbeeld:
   `woe 17 jun. 2026 · 18:30 – 20:00 (1,5 uur)`
   - Eindtijd wordt berekend uit starttijd + duur; is de duur niet te herleiden (bijv. "2-3 uur", "Max 4 uur"), dan wordt alleen de duur als tekst getoond.
   - Ontbreekt een starttijd, dan staat er alleen datum + duur.
   - De bestaande duur-regel in "Details" blijft staan (dat blok is de volledige specificatie).

2. **Onderdelen-lijst (projectregel en werkbank)**
   Achter de tijd komt de duur, dus in plaats van `— · voorkeur 18:30` wordt het `— · voorkeur 18:30 (1,5 uur)`. Alleen tonen als er een duur is ingevuld.

## Technisch
- Duur-parsing hergebruiken uit `src/lib/timeUtils.ts` (`parseDuration`, `formatTimeHHmm`); alleen een eindtijd tonen als de duurstring eenduidig te parsen is (geen bereik zoals "2-3" en geen "max").
- Wijzigingen in `src/components/partner-portal/PartnerItemSheet.tsx` (blok bij "Omschrijving van de activiteit") en in de regelweergave `PartnerProjectItemRow.tsx` / werkbank-regel.
- Presentatie-only: geen database- of API-wijzigingen.
- Unit-test voor de helper die "starttijd + duur → eindtijd/label" bepaalt, inclusief de gevallen waarin geen eindtijd berekend mag worden.
