# Transparante prijsopbouw in onderdeel-label

## Probleem
Onder het bedrag van een onderdeel staat nu alleen het totaal (bv. "€ 3.600,00 totaal"). Niet direct te verifiëren waar dat bedrag vandaan komt — vooral bij `per_person_per_day` waar prijs × personen × dagen meespeelt.

## Oplossing — `src/components/admin/AdminQuotePriceEditor.tsx`
Voeg in de trigger-button (onder de hoofdprijs) een extra regel toe die de berekening expliciet maakt, alléén wanneer er een eenheidsprijs (admin override) bekend is en het type níét "totaal" is:

- `per_person_per_day`: `€ 12,00 × 150p × 2d = € 3.600,00`
- `per_person`: `€ 16,16 × 150p = € 2.424,00`

Styling: `text-[11px] text-muted-foreground`, direct onder de hoofdregel. Geen popover-wijziging (die toont al een "Totaal: …"-regel bij invoer).

Niet voor `quoted_price` zonder override en niet voor `total`-prijstype (daar is geen breakdown zinvol). Geen DB-, edge- of API-wijzigingen.
