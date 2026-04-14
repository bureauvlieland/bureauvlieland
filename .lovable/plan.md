

## Plan: Project aanmaken voor Stedelijk Gymnasium Haarlem (mei 2026)

### Wat wordt gedaan

Via de database worden de volgende zaken aangemaakt:

**1. Project (program_request) aanmaken**
- Klant: Ineke Haeck / Stedelijk Gymnasium Haarlem
- E-mail: i.haeck@sghaarlem.nl
- Datums: 19, 20, 21, 22 mei 2026 (di t/m vr)
- Aantal personen: 166
- Type: maatwerk/offerte (quote)
- Status: active
- Notities: referentie naar originele offerte 2180173

**2. Kostenregels toevoegen (program_request_items)**

De meeste regels zijn geen echte activiteiten maar logistieke kosten. Deze worden als losse kosten (day_index = -1, provider = "bureau") op het project gezet:

- Overtocht Doeksen heenreis — €2.028,52
- Overtocht Doeksen terugreis — €2.028,52
- Toeristenbelasting — €1.540,48
- Bagagevervoer retour — €830,00
- Fietshuur totaal — €2.115,20
- Materiaalhuur — €500,00
- Kampvuur / brandhout — €75,00
- Huurtent Apollo (66 st) — €2.805,00
- Legertent (2 st) — €600,00
- Staplaats Stortemelk — €1.133,55
- Kampeerterrein Stortemelk — €2.514,90
- Zaalhuur Bolder — €500,00
- Huur kooktent — €150,00
- Staplaats Legertent — €75,00
- Reserveringskosten Stortemelk — €15,75
- Verblijf Lange Paal — €2.203,65
- Eindschoonmaak Lange Paal — €50,00
- Euro voor de natuur (SBB) — €166,00
- Administratiekosten Lange Paal — €17,50
- Catering veg. avondmaaltijden — €5.229,00
- 15% bureaukosten — €4.669,37

**De VOC-activiteit** (Afhuur VOC & materiaal + personeel, €4.154,00) wordt als activiteit-item toegevoegd (met de juiste categorie en dag-index zodra het programma duidelijk is).

**3. Bouwstenen**
Ik maak geen nieuwe bouwstenen aan — dit zijn voornamelijk eenmalige kostenregels specifiek voor dit project. Als je na de volgende mail meer info hebt over activiteiten, kunnen we die alsnog als bouwstenen aanmaken.

### Technisch
- Insert in `program_requests` via database insert tool
- Bulk insert in `program_request_items` voor alle kostenregels
- Alle kosten als `day_index = -1`, `provider_id = "bureau"`, `skip_partner_notification = true`
- Omschrijvingen inclusief aantallen en eenheidsprijzen in `admin_price_notes`

### Opmerking
Je gaf aan hierna nog een mailconversatie te sturen met meer programma-info. Na goedkeuring van dit plan maak ik het project aan, en verwerk ik de aanvullende info zodra je die stuurt.

