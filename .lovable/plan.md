

# Plan: BTW-tarieven corrigeren volgens Nederlandse regelgeving

## Nederlandse BTW-regels (samenvatting)

| Tarief | Van toepassing op |
|--------|-------------------|
| 9% | Voedsel en non-alcoholische dranken (horeca/catering), logies, personenvervoer |
| 21% | Activiteiten, entertainment, locatiehuur, materiaalverhuur, diensten, alcoholische dranken |

## Huidige fouten gevonden

Na analyse van alle 82 bouwstenen zijn de volgende correcties nodig:

### Catering: van 21% naar 9% (voedsel/non-alcoholische dranken)

| ID | Naam | Huidig | Correct | Reden |
|----|------|--------|---------|-------|
| `borrel` | Borrel & Hapjes | 21% | 9% | Voedsel (horeca) |
| `luxe-lunch` | Luxe Lunchbuffet | 21% | 9% | Voedsel (horeca) |
| `strand-bbq` | Strand BBQ | 21% | 9% | Voedsel (horeca) |
| `sunset-dinner` | Sunset Dinner | 21% | 9% | Voedsel (horeca) |
| `water-chaudfontaine` | Chaudfontaine 1L | 21% | 9% | Non-alcoholische drank in cateringcontext |
| `frisdrank-groot` | Frisdrank 1,5L | 21% | 9% | Non-alcoholische drank in cateringcontext |

### Vervoer: van 21% naar 9% (personenvervoer)

| ID | Naam | Huidig | Correct | Reden |
|----|------|--------|---------|-------|
| `taxirit-vlieland` | Taxirit Vlieland | 21% | 9% | Personenvervoer |
| `watertaxi-harlingen-vlieland` | Watertaxi | 21% | 9% | Personenvervoer |
| `rescueboat` | RescueBoat Transfer | 21% | 9% | Personenvervoer |
| `vliehors-expres-groep` | Vliehors Expres (groep) | 21% | 9% | Personenvervoer |

### Excursies: van 9% naar 21% (recreatieve dienst, geen vervoer)

| ID | Naam | Huidig | Correct | Reden |
|----|------|--------|---------|-------|
| `rondleiding-brouwerij-fortuna` | Rondleiding Brouwerij Fortuna | 9% | 21% | Recreatieve dienst |
| `zeehondentocht-exclusief` | Zeehondentocht Exclusief | 9% | 21% | Recreatieve excursie |

### Correct gebleven (geen wijziging nodig)
- Alcoholische dranken (bier, wijn, bubbels, drankafkoop): 21% -- correct
- Maaltijden die al 9% hebben (luncharrangement, 3-gangen diner, etc.): correct
- Bootretour Doeksen: 9% -- correct (personenvervoer)
- Vliehors Expres Exclusief: 9% -- correct (personenvervoer)
- Alle outdoor/activiteiten: 21% -- correct
- Entertainment: 21% -- correct
- Locaties: 21% -- correct
- Services: 21% -- correct
- Overig (materiaal): 21% -- correct
- Fietshuur/tandemhuur: 21% -- correct (verhuur, geen vervoer)

## Technische uitvoering

Een database-migratie met de volgende SQL-updates:

```text
-- Catering: voedsel/non-alcoholisch van 21% naar 9%
UPDATE building_blocks SET vat_rate = 9
WHERE id IN ('borrel','luxe-lunch','strand-bbq','sunset-dinner',
             'water-chaudfontaine','frisdrank-groot');

-- Vervoer: personenvervoer van 21% naar 9%
UPDATE building_blocks SET vat_rate = 9
WHERE id IN ('taxirit-vlieland','watertaxi-harlingen-vlieland',
             'rescueboat','vliehors-expres-groep');

-- Excursies: recreatief van 9% naar 21%
UPDATE building_blocks SET vat_rate = 21
WHERE id IN ('rondleiding-brouwerij-fortuna','zeehondentocht-exclusief');
```

Geen wijzigingen aan frontend-code nodig -- de BTW-tarieven worden al per bouwsteen uit de database gelezen.

