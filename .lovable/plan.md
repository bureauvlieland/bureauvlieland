

# Configurator vereenvoudigen en toegankelijker maken

## Wat gaan we veranderen?

De programma-configurator op de website wordt laagdrempeliger en meer begeleidend. We vereenvoudigen de wizard-stappen, voegen meer uitleg toe, en verwijderen prijsindicaties die een verkeerd beeld geven.

---

## 1. Wizard stap 1: Vereenvoudig programmatypes

**Nu:** 6 opties (Teamuitje, Heisessie, Incentive reis, Zakelijk evenement, Meerdaags bedrijfsuitje, Overig) -- dit is overweldigend en de grenzen zijn vaag.

**Straks:** 3 duidelijke opties met meer begeleidende tekst:

| Optie | Omschrijving |
|-------|-------------|
| **Zakelijk** | Teamuitje, heisessie, incentive of bedrijfsevenement |
| **Prive** | Familieweekend, vriendengroep, jubileum of bruiloft |
| **Losse activiteiten** | Ik wil alleen losse activiteiten boeken |

Elk met een sfeerbeeld, korte toelichting en een subtekst met voorbeelden zodat bezoekers zich herkennen.

De `ProgramType` type wordt aangepast naar `"zakelijk" | "prive" | "los"`.

## 2. Meer begeleidende teksten door de hele wizard

Elke stap krijgt een vriendelijkere intro met uitleg *waarom* we iets vragen:

- **Stap 1:** "We stemmen het aanbod graag af op uw situatie. Waar mogen we u mee helpen?"
- **Stap 2:** "Met deze gegevens kunnen wij de beschikbaarheid checken en een passend voorstel samenstellen."
- **Stap 2.5 (templates):** "Wilt u een idee hoe een dag op Vlieland eruit kan zien? Bekijk een van onze voorbeeldprogramma's, of stel zelf iets samen."
- **Stap 3 (logies):** "Op Vlieland is het aanbod aan accommodaties beperkt. Wij kennen alle mogelijkheden en helpen u graag aan een geschikte plek."

## 3. Prijzen verwijderen uit voorbeeldprogramma's

**TemplateSelector.tsx:** Verwijder de `~EUR X p.p.` badge van de template-kaarten.

**TemplatePreviewSheet.tsx:** Verwijder het volledige prijsoverzicht-blok ("Indicatieve totaalprijs") en de individuele item-prijzen uit de preview. Houd alleen het programma-overzicht (tijden en activiteiten).

## 4. "Zo werkt het" blok aanpassen

De huidige stappen zijn vrij zakelijk. We herschrijven ze in warmere, begeleidende taal:

1. "Stel uw programma samen" -- "Kies activiteiten die passen bij uw groep"
2. "Wij checken beschikbaarheid" -- "Onze lokale partners bekijken of alles kan"
3. "U ontvangt een voorstel" -- "Met definitieve tijden en prijzen"
4. "Bevestig wat u wilt" -- "U bepaalt per onderdeel wat doorgaat"
5. "Wij coördineren alles" -- "Zodat u zich nergens zorgen over hoeft te maken"

Minder stappen (5 i.p.v. 6) en meer op de bezoeker gericht.

## 5. Bouwsteenkaarten: prijs minder prominent

Op de `BuildingBlockCard` wordt de prijsbadge rechtsbovenin verwijderd. In plaats daarvan een subtielere "Vanaf EUR X p.p." onderaan bij de meta-info, zodat prijs niet het eerste is dat opvalt maar wel beschikbaar blijft.

---

## Technisch overzicht

| Bestand | Wijziging |
|---------|-----------|
| `ConfiguratorWizard.tsx` | ProgramType naar 3 opties, begeleidende teksten per stap |
| `TemplateSelector.tsx` | Prijsindicatie verwijderen van kaarten |
| `TemplatePreviewSheet.tsx` | Prijsblok + item-prijzen verwijderen |
| `HowItWorksBlock.tsx` | Stappen herschrijven (5 i.p.v. 6), warmere taal |
| `BuildingBlockCard.tsx` | Prijsbadge verplaatsen van prominent naar subtiel |
| `ProgrammaSamenstellen.tsx` | Hero-teksten aanpassen, meer begeleidend |
| `src/types/buildingBlock.ts` | (evt.) ProgramType type update als het daar staat |

Geen database-wijzigingen nodig. Puur frontend-aanpassingen.

