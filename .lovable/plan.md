

# Plan: Handleidingen partner portaal updaten en uitbreiden

## Wat wordt aangepast

De handleidingenpagina (`PartnerGuides.tsx`) wordt bijgewerkt om de recente wijzigingen en nieuwe functionaliteiten correct te documenteren.

### 1. Sectie "Aan de slag" -- bijwerken

**Account activeren** aanpassen:
- Vermelden dat partners ook direct kunnen inloggen met de verstrekte inloggegevens (formaat Vlieland-XXXX) zonder eerst het wachtwoord te resetten
- De huidige tekst suggereert dat alleen via de activatielink werkt; dat klopt niet meer

**Nieuw item: "Algemene voorwaarden instellen"**
- Uitleggen dat partners in Instellingen kunnen kiezen tussen:
  - Eigen PDF met voorwaarden uploaden
  - De Standaardvoorwaarden Partneraanbod Bureau Vlieland accepteren
- Waarom dit belangrijk is (juridische audit-trail bij boekingen)

### 2. Sectie "Aanvragen verwerken" -- uitbreiden

**"Aanvraag bevestigen" verduidelijken:**
- Toelichten dat bij bevestiging een prijs (excl. BTW) moet worden opgegeven
- Optioneel een voorkeurstijd/datum kan worden meegegeven
- De verwachte commissie wordt als voorberekening getoond

**Nieuw item: "Referentienummer en versie"**
- Uitleggen dat elke aanvraag een referentienummer heeft (#BV-...)
- Bij wijzigingen door de klant verschijnt een versie-indicator
- Het referentienummer kan worden gekopieerd via de kopieerknop

### 3. Sectie "Facturatie" -- uitbreiden

**"Commissiepercentages" aanvullen:**
- Commissie wordt berekend over het bedrag exclusief BTW
- Toevoegen dat de verwachte commissie alvast zichtbaar is bij elke aanvraag

**Nieuw item: "Facturatiemodel"**
- Uitleggen dat er twee modellen bestaan:
  - **Partner Direct**: partner factureert rechtstreeks aan de klant
  - **Bureau Centraal**: partner factureert aan Bureau Vlieland
- Het model wordt per project bepaald; dit is zichtbaar in de aanvraagdetails

**"Factuur registreren" verduidelijken:**
- Bij Bureau Centraal: factuur sturen naar Bureau Vlieland
- Vermelding dat upload van een factuurkopie mogelijk is

### 4. Sectie "Dashboard" -- nieuw toevoegen

Nieuwe sectie die het dashboard uitlegt:
- **Actiebanner**: toont openstaande taken (nieuwe aanvragen, tegenvoorstellen, te factureren items)
- **Statistiekknoppen**: klikbaar om direct naar de juiste tab of pagina te navigeren
- **Gecombineerd overzicht**: activiteiten en logies in een lijst, gesorteerd op urgentie
- **Agenda**: de komende 14 dagen met bevestigde/geaccepteerde items
- **YTD-module**: toont jaar-tot-datum omzet en commissie

### 5. Sectie "Mijn Aanbod" -- nieuw toevoegen (voor activiteitenpartners)

Nieuwe sectie die uitlegt:
- Het overzicht van eigen activiteiten/bouwblokken
- Hoe een nieuw blok toe te voegen (concept-status)
- Dat blokken pas zichtbaar worden voor klanten na goedkeuring door Bureau Vlieland
- Velden zoals duur, prijs, min/max personen, seizoensnotities

### 6. FAQ -- uitbreiden

Nieuwe vragen toevoegen:
- **"Wat is het verschil tussen 'Partner Direct' en 'Bureau Centraal' facturatie?"** -- beknopte uitleg van de twee modellen
- **"Hoe kan ik mijn beschikbaarheid beheren?"** -- verwijzing naar de beschikbaarheidsmanager op het dashboard

## Technisch

**Bestand:** `src/pages/PartnerGuides.tsx`

Wijzigingen:
- Nieuwe Lucide-iconen importeren (bijv. `BarChart3`, `FileText`, `CreditCard`)
- 2 nieuwe Card-secties toevoegen (Dashboard, Mijn Aanbod)
- Bestaande AccordionItems aanpassen en uitbreiden
- 2 nieuwe FAQ-items toevoegen
- Conditioneel tonen van "Mijn Aanbod" sectie op basis van `partnerData?.partner_type` (net als de bestaande Logies-sectie)

Geschatte omvang: circa 150 regels toevoegen, 30 regels aanpassen.

