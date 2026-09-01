# Prijs €0 toestaan en "€NaN" wegwerken

Bij het bewerken van een activiteit (admin) wil je soms alleen de locatie aanpassen. Nu blokkeert het scherm een prijs van €0, en zolang het veld leeg is toont de rekenregel "€NaN p.p. × 115 personen".

## Wat er verandert

1. **€0 is een geldige prijs.** De controle "Prijs moet groter zijn dan €0" vervalt. Alleen negatieve of ongeldige getallen worden nog geweigerd. Bij een nieuw, nog niet gepubliceerd onderdeel blijft invullen verplicht, maar €0 mag daar dan ook.
2. **Geen "€NaN" meer.** Zolang het prijsveld leeg is (of geen geldig getal bevat), toont het rekenblok geen bedrag maar alleen de uitleg "Vul een bedrag in om het totaal te berekenen." Bij €0 toont het netjes "€0,00" met de gebruikelijke opbouwregel.
3. **Leeg blijft leeg.** Leeglaten betekent nog steeds: bestaande prijs (partnerofferte of bouwsteenprijs) ongewijzigd laten. Expliciet 0 invullen betekent: prijs wordt €0.

## Technisch

- `src/components/admin/AdminEditActivitySheet.tsx`:
  - validatie: verwijder de `price === 0` blokkade; `price < 0` en `!isFinite` blijven.
  - verplicht-check bij `pending_added`: blijft "veld mag niet leeg zijn", maar 0 wordt geaccepteerd.
  - preview-blok: onderscheid `hasPrice` (geldig getal ≥ 0) van "leeg"; render de breakdown/bedragregel alleen bij een geldig getal, anders alleen de hint.
  - waarschuwingsdrempels (p.p. > 500, totaal < 50) blijven ongewijzigd en vuren niet bij een leeg veld.
