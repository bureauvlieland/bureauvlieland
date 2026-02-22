

# Rechterkolom vereenvoudigen voor snellere conversie

## Probleem

De huidige sidebar bevat te veel informatie die de gebruiker afleidt van het einddoel: het indienen van een vrijblijvende aanvraag. Specifiek:

- **Groepsgrootte en datum** staan prominent bovenaan, terwijl die al in de wizard zijn ingevuld
- **Factureringsgroepen** ("Gefactureerd door Bureau Vlieland" / "door aanbieders") zijn irrelevant voor de klant in deze fase
- **Gedetailleerde prijsopbouw** (subtotaal, BTW, coordinatiefee apart) leidt af en kan afschrikken
- **Deel-knop** neemt ruimte in van de CTA
- De CTA-knop "Controleren en aanvragen" staat helemaal onderaan, buiten beeld

## Wat verandert er?

### 1. Groepsgrootte en datum inklapbaar maken
De personen- en datuminvoer worden in een compact, ingeklapt blok getoond (bijv. "20 personen -- 17 mrt.") met een "Wijzig"-knop om uit te klappen. Zo is er direct meer ruimte voor de activiteitenlijst.

### 2. Factureringsgroepen verwijderen
Alle activiteiten worden als een platte lijst getoond zonder "Gefactureerd door..." koppen. De klant hoeft niet te weten wie factureert -- dat komt later.

### 3. Prijsoverzicht vereenvoudigen
In plaats van subtotaal + BTW + fee apart, toon alleen:
- Per item: korte naam + indicatieve prijs (zoals nu)
- Onderaan: een enkele regel "Indicatief totaal: EUR X" (inclusief fee, inclusief BTW)
- Kleine disclaimer: "Exacte prijzen na bevestiging"

De coordinatiefee-regel en de volledige BTW-uitsplitsing verdwijnen uit de sidebar.

### 4. CTA prominenter en altijd zichtbaar
- De knop "Vrijblijvend aanvragen" krijgt meer nadruk (groter, opvallender kleur)
- De knop wordt sticky aan de onderkant van de sidebar zodat hij altijd zichtbaar is
- Tekst wijzigt van "Controleren en aanvragen" naar "Vrijblijvend aanvragen" (lagere drempel)

### 5. Deel-knop verplaatsen
De "Deel programma" knop wordt een klein icoontje in de header naast "Uw Programma", in plaats van een volledige knop onder de CTA.

## Technische wijzigingen

### `src/components/configurator/ProgramEditor.tsx` (compact mode, regels 471-658)

1. **Personen/datum-sectie** (regels 478-511): Vervangen door een `Collapsible` component
   - Ingeklapt: toont samenvatting "20 personen -- 17 mrt." met edit-icoontje
   - Uitgeklapt: de huidige invoervelden

2. **Activiteitenlijst** (regels 523-576): Verwijder de `groupedBlocks.bureau` / `partner` / `self_arranged` groepering. Toon alle items als platte lijst gesorteerd op volgorde via `renderDayItems(0)` (of dagtabs als meerdere dagen)

3. **Bureau fee blok** (regels 578-587): Verwijderen uit compact mode

4. **Prijsoverzicht** (regels 590-613): Vervangen door enkele regel:
   ```
   Indicatief totaal: EUR X
   * Exacte prijzen na bevestiging
   ```

5. **CTA-sectie** (regels 624-646):
   - Verwijder "Deel programma" knop (verplaatst naar header)
   - Maak CTA sticky met `sticky bottom-0 bg-background pt-3 pb-1 border-t`
   - Wijzig tekst naar "Vrijblijvend aanvragen"

6. **Share-knop**: Verplaatsen naar de header in `ConfiguratorCart.tsx` naast de "Uitklappen" knop

### `src/components/configurator/ConfiguratorCart.tsx`

- Share-icoontje toevoegen in de header naast "Uitklappen"
- ShareProgramDialog hier ook importeren en renderen

### `src/components/configurator/CartItemDetails.tsx`

- Geen wijzigingen nodig; de individuele items blijven zoals ze zijn (naam, prijs, tijd, opmerking)

