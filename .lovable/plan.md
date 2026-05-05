## Doel

Eénmalig een Word-draaiboek (.docx) genereren voor project **BV-2604-0002** (Stedelijk Gymnasium Haarlem, schoolkamp Vlieland 19–22 mei 2026, 166 personen) dat je naar je partners kunt sturen. Dit is een **scriptmatige export**, geen feature in de app — sneller en preciezer voor deze eenmalige vraag.

## Aanpak

Ik draai een Node-script (gebruikt `docx` library, conform de DOCX-skill) dat alle data uit de database én het volledige Vlielandboekje combineert tot één Word-document met centraal draaiboek + losse partner-bijlagen.

## Inhoud van het document

**Voorblad**
- Titel: "Draaiboek Vlielandreis Klas 4 — Stedelijk Gymnasium Haarlem"
- Project BV-2604-0002, 19–22 mei 2026, 166 personen
- Bureau Vlieland branding + Wadden Werelderfgoed-ambassadeur logo

**Deel 1 — Algemeen draaiboek (voor alle partners)**
- Klant- & contactgegevens (Ineke Haeck / SGH)
- Groepsverdeling: Stortemelk (4A/4E/4F, 83 pers.) / Lange Paal (4B/4C/4D, 83 pers.)
- Logistiek overzicht: ferry heen/terug, fietsen, bagage, materiaal
- Volledig dagprogramma uit het boekje (di t/m vr) — inclusief tijden, locaties, ontbijtcorvee, workshops
- Theater Odyssee / A Midsummer Night's Dream uitleg
- Paklijst en huisregels (uit boekje)
- Noodcontact

**Deel 2 — Partner-bijlagen** (één pagina/sectie per partner, met page-break)
Op basis van de items in de offerte zijn dit feitelijk bureau-interne leveranciers, dus ik genereer bijlagen per logische rol:

- **Bijlage A — Camping Stortemelk**: aankomst, aantal staplaatsen (66 + 2 legertent), Apollo-tenten, kooktent, zaalhuur Bolder (2 avonden), opslagcontainer, kampvuur, eindafrekening via Bureau Vlieland
- **Bijlage B — Natuurkampeerterrein Lange Paal**: 83 personen, verblijf begeleiders, 8 damesfietsen, eindschoonmaak
- **Bijlage C — Rederij Doeksen**: heen 14:00 di 19/5, retour 12:00 vr 22/5, 166 pax + bagagevervoer (live ferry-tijden bevestigen)
- **Bijlage D — Fietsverhuur**: 75 schoolreisfietsen + 8 damesfietsen, ophaal di 16:30, retour vr 10:30
- **Bijlage E — Catering**: 3 vegetarische avondmaaltijden × 166 pers., locaties, allergieën navragen
- **Bijlage F — Vlieland Outdoor Center (VOC)**: Strandspektakel + Lasergame/Discgolf, programma woensdag & donderdag, rotatie-schema klassen
- **Bijlage G — Workshopbegeleiders (intern SGH-team)**: workshop-overzicht met begeleider + benodigdheden uit het boekje (Bunker, Vogelbingo, Bootcamp, Hardlooptraining, Duik in geschiedenis etc.)
- **Bijlage H — Materiaal & overig**: kampvuurhout, kartonnen decorstukken (13 fietsdozen), waterkokers, koffievoorzieningen, geluidsbox

Elke bijlage opent met: contactpersoon Bureau Vlieland, project-ref BV-2604-0002, datum, en een korte takenlijst voor die partner.

## Stijl

- Word-document, A4, professionele opmaak
- Brand-kleuren Bureau Vlieland (uit codebase ophalen)
- Leesbare typografie, duidelijke hoofdstukken, tabellen voor dagprogramma's
- Paginanummers en kop/voettekst met projectnummer
- Output: `/mnt/documents/Draaiboek_BV-2604-0002_Vlielandreis_SGH.docx`

## Wat ik niet doe

- Geen wijzigingen in de app/codebase
- Geen e-mail versturen — je krijgt alleen het bestand om te downloaden
- Geen prijzen vermelden (financieel zit in de offerte/factuur, niet in een operationeel draaiboek)

Na goedkeuring lever ik het Word-bestand. Wil je achteraf nog iets wijzigen, dan maak ik een v2.
