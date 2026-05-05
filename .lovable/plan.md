## Wat ik ga doen

Twee acties op basis van je input + de oude offerte (sept 2025 → mei 2026):

### 1. Bunkermuseum Vlieland aanmaken als partner (database)

Nieuwe partner toevoegen via migratie:
- **Naam:** Bunkermuseum Vlieland
- **E-mail (notificaties):** info@bunkermuseumvlieland.nl
- **Telefoon:** +31 6 45113566
- **Status:** actief, conform bestaande partner-conventies (geen auth-account, alleen contact)

### 2. Draaiboek v2 genereren (`Draaiboek_BV-2604-0002_Vlielandreis_SGH_v2.docx`)

Nieuwe versie naast v1, met deze toevoegingen/correcties:

**Contactenblok vooraan (vervangt huidige noodcontact):**
- Voorbereiding: **Erwin Soolsma — 06 49913085**
- Tijdens verblijf / noodgevallen: **Karla Moust — 06 53671665**

**Logistiek dag 1 (di 19 mei) verfijnd:**
- Veerboot vertrek Harlingen **14:05**, aankomst Vlieland **15:45**
- Fietsen uitreiken **±16:00**
- Lange Paal-groep: **op de fiets** naar camping
- Stortemelk-groep: **lopend** naar camping

**Bagagevervoer (Bijlage opnemen):**
- Contact: **Rogier Rispens — 06 51360578**
- Twee bagagekarren in Harlingen klaarzetten (één Stortemelk / één Lange Paal), met **brief erop** ter herkenning

**Tenten — verantwoordelijken (Stortemelk + Lange Paal):**
- Vervoer, opzetten en afbreken door Stortemelk-medewerkers
- Verantwoordelijke: **Angela Zijnge — 06 51928977**
- Coördinator groepen Stortemelk: **Karin Kwant — 06 86868622**

**Legertenten + brandhout:**
- Geleverd door **Fietsverhuur Jan van Vlieland — Klaas Houter — 06 53949984**
- Plaatsing **maandag 18 mei** (dag voor aankomst), zowel Lange Paal als Stortemelk
- Brandhout wordt tegelijk afgeleverd

**Stortemelk zaalhuur:** Grote zaal Bolder op **dinsdagavond 19 mei + donderdagavond 21 mei** (uit oude offerte: 2 avonden — vertaald naar mei-data)

**Bunkermuseum als nieuwe bijlage:**
- Eigen partner-sectie met contactgegevens
- Operationele instructies voor hun bezoek-onderdeel in het programma

**Aanvullingen uit de oude offerte (sept→mei vertaald):**
Detailcijfers die in v1 ontbraken:
- 75 schoolfietsen + 12 damesfietsen + **2 e-bikes + 2 elektrische bakfietsen** (v1 had alleen 75+8)
- **66 Apollo-tenten + 2 legertenten** (preciezer)
- 99 staplaatsen Stortemelk (33 tenten × 3 nachten)
- Kooktent op Stortemelk: woensdag + donderdag
- Materiaal: koffiezet, koelkasten, waterkokers, geluidset, kartonhandling, inzet auto's
- VOC: afhuur + 2x personeel (1 strand / 1 bos), 3 ochtenden
- Catering: 498 vegetarische avondmaaltijden (3× 166)

**Behoud uit v1:**
- Branding + Wadden-ambassadeur
- Volledige overname Vlielandboekje (programma, paklijst, huisregels, workshops)
- Klantgegevens SGH zichtbaar
- Geen prijzen (operationeel doc)

## Output

- Migratie voor Bunkermuseum-partner (1 INSERT met de juiste velden uit `partners`-tabel)
- `/mnt/documents/Draaiboek_BV-2604-0002_Vlielandreis_SGH_v2.docx`
- v1 blijft beschikbaar ter vergelijking

## Wat ik niet doe

- Geen wijziging aan de offerte/projectdata in de database (alleen nieuwe partner aanmaken)
- Geen e-mail naar Bunkermuseum — alleen aanmaken
