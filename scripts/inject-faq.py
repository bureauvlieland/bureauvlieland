#!/usr/bin/env python3
"""Insert FaqSection before </main> in 10 landing pages + tighten 3 titles."""
import re
from pathlib import Path

FAQS = {
    "BedrijfsuitjeVlieland": ("bedrijfsuitje-vlieland", [
        ("Wat kost een bedrijfsuitje op Vlieland?",
         "De prijs hangt af van groepsgrootte, programma en overnachting. Een dagprogramma start vanaf ongeveer € 95 per persoon (excl. overtocht); een meerdaags bedrijfsuitje met overnachting en catering ligt hoger. U ontvangt altijd een transparante offerte op maat."),
        ("Hoeveel tijd moeten wij rekenen voor een bedrijfsuitje op Vlieland?",
         "Reken minimaal één volle dag — de overtocht vanaf Harlingen duurt 90 minuten. Voor inhoudelijke programma's adviseren wij twee dagen met een overnachting, zodat er ruimte is voor zowel activiteit als reflectie."),
        ("Kunnen wij met de auto naar Vlieland voor een bedrijfsuitje?",
         "Nee, Vlieland is autoluw — auto's blijven op het vasteland (parkeerterrein Harlingen). Op het eiland verplaatst u zich met de fiets, te voet of met een groepsvervoer dat wij voor u regelen."),
        ("Welke activiteiten zijn mogelijk voor een bedrijfsuitje op Vlieland?",
         "Onder andere wadexcursies, blokarten, powerkiten, paardrijden, zeilen, kookworkshops en strandactiviteiten. Bureau Vlieland combineert deze tot een samenhangend programma dat past bij het doel van uw uitje."),
    ]),
    "TeamuitjeVlieland": ("teamuitje-vlieland", [
        ("Wat kost een teamuitje op Vlieland?",
         "Een teamuitje op Vlieland start vanaf ongeveer € 95 per persoon voor een dagprogramma (excl. overtocht). De uiteindelijke prijs hangt af van groepsgrootte, activiteiten en eventuele overnachting."),
        ("Hoe lang duurt een teamuitje op Vlieland?",
         "Door de overtocht van 90 minuten is een dagdeel niet realistisch. Reken minimaal één volle dag; voor teambuilding met diepgang adviseren wij twee dagen met een overnachting."),
        ("Welke teambuilding-activiteiten zijn er op Vlieland?",
         "Wadexcursies, blokarten, powerkiten, zeilen, paardrijden langs het strand, dune-walks en kookworkshops. Wij combineren actieve en reflectieve onderdelen tot een programma dat samenwerking versterkt."),
        ("Kunnen wij met de auto naar Vlieland voor een teamuitje?",
         "Nee, Vlieland is autoluw. Auto's parkeert u in Harlingen; op het eiland gaat alles per fiets, te voet of met groepsvervoer dat wij regelen."),
    ]),
    "HeisessieVlieland": ("heisessie-vlieland", [
        ("Welke locaties op Vlieland zijn geschikt voor een heisessie?",
         "Wij werken met afgesloten zalen in hotels, strandpaviljoens en duinlocaties. Welke locatie passend is hangt af van groepsgrootte, het gewenste karakter (formeel of informeel) en of er overnacht wordt."),
        ("Hoe lang duurt een heisessie op Vlieland?",
         "De meeste heisessies duren twee dagen met één overnachting. Dat geeft een volwaardig werkdeel én ruimte voor informele reflectie 's avonds en een korte ochtendsessie de tweede dag."),
        ("Wat kost een heisessie op Vlieland?",
         "Indicatie: € 350–€ 550 per persoon voor een tweedaagse heisessie inclusief logies, vergaderlocatie en catering. De exacte prijs hangt af van locatie en groepsgrootte; u ontvangt een offerte op maat."),
        ("Kunnen wij een heisessie combineren met een teamuitje?",
         "Ja — een halve dag teamuitje op Vlieland combineert goed met een vergaderochtend. Zie ook onze pagina over een teamuitje op Vlieland voor activiteiten."),
    ]),
    "FamilieweekendVlieland": ("familieweekend-vlieland", [
        ("Wat kost een familieweekend op Vlieland?",
         "Een familieweekend start vanaf ongeveer € 175 per persoon voor twee nachten op basis van een groepsaccommodatie, excl. overtocht en activiteiten. De prijs schaalt met logiestype en programma."),
        ("Welke logies zijn geschikt voor een grote familie op Vlieland?",
         "Groepsaccommodaties, vakantiehuizen voor 8–20 personen en hotels met aangrenzende kamers. Wij selecteren een logies dat past bij de groepssamenstelling — inclusief slaapsituatie voor kinderen."),
        ("Welke activiteiten zijn er voor kinderen op Vlieland?",
         "Strandactiviteiten, wadexcursies, fietstochten, paardrijden, het Vliehors-Expressavontuur en speurtochten door de duinen. Alles binnen veilige loopafstand en zonder druk autoverkeer."),
        ("Wanneer kunnen wij het beste boeken voor een familieweekend?",
         "Voor schoolvakanties en lange weekenden adviseren wij 3–6 maanden vooraf te boeken — populaire groepsaccommodaties zijn dan snel volgeboekt. Buiten het seizoen volstaat 4–6 weken vooraf."),
    ]),
    "GroepsweekendVlieland": ("groepsweekend-vlieland", [
        ("Voor hoeveel personen kan Bureau Vlieland een groepsweekend organiseren?",
         "Van kleine groepen vanaf 8 personen tot groepen van 80+. Voor grotere groepen combineren wij meerdere logies of werken wij met een groepsaccommodatie of hotel-overname."),
        ("Wat kost een groepsweekend op Vlieland?",
         "Een groepsweekend start vanaf ongeveer € 195 per persoon voor twee nachten inclusief basisprogramma, excl. overtocht. De prijs varieert met logiestype, activiteiten en catering."),
        ("Welke logies zijn geschikt voor een grotere groep op Vlieland?",
         "Groepsaccommodaties, vakantiehuizenparken, hotels met blokboeking en in een enkel geval een volledig pension. Wij stemmen logiestype af op groepsgrootte en gewenste sfeer."),
        ("Hoe regelen jullie de overtocht voor de groep?",
         "Wij boeken de Doeksen-overtocht voor de hele groep op één Resnr en sturen u de tickets centraal toe. Op drukke data adviseren wij vroeg te boeken — heen- en terugreis op één boekingsreferentie."),
    ]),
    "IncentiveReisVlieland": ("incentive-reis-vlieland", [
        ("Wat is een incentive reis en wat kost dat op Vlieland?",
         "Een incentive reis is een exclusieve beloningsreis voor klanten of medewerkers. Op Vlieland start een tweedaagse incentive vanaf ongeveer € 595 per persoon inclusief premium logies, catering en exclusieve activiteiten."),
        ("Hoeveel dagen duurt een incentive reis op Vlieland?",
         "De meeste incentives duren 2 of 3 dagen. Dat geeft ruimte voor een aankomstdiner, een vol dagprogramma met exclusieve activiteiten, en een ontspannen vertrek na een laatste ochtend op het eiland."),
        ("Welke exclusieve activiteiten zijn mogelijk?",
         "Privé-zeiltochten, een diner op het strand bij zonsondergang, vuurtorenbeklimming buiten openingstijden, exclusieve wadexcursies met een persoonlijke gids en chef's-table-diners op bijzondere locaties."),
        ("Kunnen jullie een privé-overtocht of charter regelen?",
         "Ja — voor selecte groepen organiseren wij een privé-charter (zeilcharter of motorboot) als alternatief voor de reguliere Doeksen-veerdienst. Dit voegt exclusiviteit toe aan het programma."),
    ]),
    "JubileumVlieland": ("jubileum-vlieland", [
        ("Welke locaties zijn geschikt om een jubileum op Vlieland te vieren?",
         "Strandpaviljoens, restaurants met privézaal, hotelzalen en in de zomer ook buitenlocaties in de duinen. Wij selecteren een locatie die past bij het karakter van het jubileum en het aantal gasten."),
        ("Voor hoeveel gasten kunnen jullie een jubileum organiseren?",
         "Van intieme diners voor 10 personen tot feesten voor 150+ gasten. Voor grote gezelschappen werken wij met meerdere logies en regelen wij de groepslogistiek volledig voor u."),
        ("Wat kost een jubileumfeest op Vlieland?",
         "Een eendaags jubileumdiner met locatie en catering start vanaf ongeveer € 125 per persoon. Een jubileumweekend met overnachting en aanvullend programma ligt vanaf € 295 per persoon."),
        ("Regelen jullie ook catering en overnachtingen voor de gasten?",
         "Ja — Bureau Vlieland verzorgt alles: locatie, catering, overnachtingen voor uw gasten, eventuele activiteiten en de overtocht. Eén aanspreekpunt, één factuur."),
    ]),
    "ZakelijkEvenementVlieland": ("zakelijk-evenement-vlieland", [
        ("Welke zakelijke evenementen organiseert Bureau Vlieland op Vlieland?",
         "Kick-offs, klantendagen, productlanceringen, kleinere congressen, partnerdagen en jubilea. Voor groter teamwork zie onze pagina over een teamuitje op Vlieland; voor strategie de heisessie-pagina."),
        ("Voor hoeveel deelnemers kan een zakelijk evenement op Vlieland?",
         "Comfortabel tot circa 150 deelnemers. Daarboven werken wij met meerdere locaties of een hotel-overname. De boot-capaciteit en logies-capaciteit op Vlieland bepalen de bovengrens — wij plannen daarop."),
        ("Wat kost een zakelijk evenement op Vlieland?",
         "Een eendaags zakelijk evenement start vanaf ongeveer € 150 per persoon (locatie, catering, basisprogramma, excl. overtocht). Meerdaags met overnachting vanaf € 395 per persoon."),
        ("Welke locaties zijn beschikbaar voor een congres of evenement?",
         "Hotelvergaderzalen, strandpaviljoens, een filmtheater, eventhallen en in de zomer outdoor-locaties in de duinen. Wij matchen locatie aan deelnemersaantal, AV-eisen en sfeer."),
    ]),
    "MeerdaagsBedrijfsuitjeVlieland": ("meerdaags-bedrijfsuitje-vlieland", [
        ("Hoeveel dagen duurt een meerdaags bedrijfsuitje op Vlieland?",
         "De meeste meerdaagse bedrijfsuitjes zijn twee dagen met één overnachting. Voor diepere teambuilding of een combinatie met een heisessie adviseren wij drie dagen met twee overnachtingen."),
        ("Wat kost een meerdaags bedrijfsuitje op Vlieland?",
         "Vanaf ongeveer € 295 per persoon voor twee dagen inclusief logies, ontbijt, één activiteit en een groepsdiner. De exacte prijs hangt af van logiestype en programma — u ontvangt een offerte op maat."),
        ("Welke logies zijn geschikt voor een meerdaags bedrijfsuitje?",
         "Hotels in dorp Oost-Vlieland, een groepsaccommodatie aan de duinrand of een hotel met blokboeking. Wij kiezen op basis van groepsgrootte, gewenste sfeer en budget."),
        ("Wat doe je in de avond tijdens een meerdaags bedrijfsuitje op Vlieland?",
         "Een groepsdiner op een bijzondere locatie, een avondwandeling door de duinen, sterren kijken op het strand of een borrel in een lokaal café. Geen verplichte invulling — wij doen suggesties."),
    ]),
    "BedrijfsuitjeIdeeenVlieland": ("bedrijfsuitje-ideeen-vlieland", [
        ("Welke originele ideeën zijn er voor een bedrijfsuitje op Vlieland?",
         "Een wadexcursie met gids, blokarten op het strand, powerkiten, een Vliehors-Expresstocht, een kookworkshop met lokale chef, of een avondsurvival in de duinen. Wij combineren onderdelen op maat."),
        ("Wat is een goed bedrijfsuitje voor een klein team?",
         "Voor teams tot 12 personen werkt een combinatie van een actieve ochtend (bv. zeilen of blokarten), gezamenlijke lunch en een reflectiesessie op een rustige locatie het beste."),
        ("Welke actieve bedrijfsuitjes kunnen wij op Vlieland doen?",
         "Blokarten, powerkiten, zeilen, mountainbiken door het duingebied, paardrijden langs de vloedlijn, en georganiseerde dune-walks. Allemaal te combineren in één programma."),
        ("Hoe combineer je een actief bedrijfsuitje met ontspanning?",
         "Plan een actieve ochtend, gevolgd door een uitgebreide lunch en een rustig middagprogramma — bv. een wandeling met een natuurgids of een bezoek aan het Tromp's Huys museum."),
    ]),
}

LONG_TITLE_FIXES = {
    "FamilieweekendVlieland.tsx": [
        ("<title>Familieweekend Vlieland – Reünie of uitje met de hele familie | Bureau Vlieland</title>",
         "<title>Familieweekend op Vlieland organiseren | Bureau Vlieland</title>"),
        ('content="Familieweekend Vlieland – Bureau Vlieland"',
         'content="Familieweekend op Vlieland organiseren | Bureau Vlieland"'),
    ],
    "GroepsweekendVlieland.tsx": [
        ("<title>Groepsweekend Vlieland – Organiseer een onvergetelijk weekend | Bureau Vlieland</title>",
         "<title>Groepsweekend op Vlieland organiseren | Bureau Vlieland</title>"),
        ('content="Groepsweekend Vlieland – Bureau Vlieland"',
         'content="Groepsweekend op Vlieland organiseren | Bureau Vlieland"'),
    ],
    "JubileumVlieland.tsx": [
        ("<title>Jubileum vieren op Vlieland – Verjaardag, pensioen of huwelijksjubileum | Bureau Vlieland</title>",
         "<title>Jubileum vieren op Vlieland | Bureau Vlieland</title>"),
        ('content="Jubileum vieren op Vlieland – Bureau Vlieland"',
         'content="Jubileum vieren op Vlieland | Bureau Vlieland"'),
    ],
}

base = Path("src/pages")

for fname_stem, (slug, faqs) in FAQS.items():
    fpath = base / f"{fname_stem}.tsx"
    text = fpath.read_text()

    # 1. Insert import if missing
    if 'from "@/components/FaqSection"' not in text:
        # Add after the last existing @/components import
        import_line = 'import { FaqSection } from "@/components/FaqSection";\n'
        m = list(re.finditer(r'^import .+ from "@/components/[^"]+";\s*\n', text, re.M))
        if m:
            last = m[-1]
            text = text[:last.end()] + import_line + text[last.end():]
        else:
            # Fallback: after first import
            m2 = re.search(r'^import .+;\s*\n', text, re.M)
            text = text[:m2.end()] + import_line + text[m2.end():]

    # 2. Build FAQ JSX
    items_jsx = ",\n".join(
        f"            {{ question: {q!r}, answer: {a!r} }}" for q, a in faqs
    )
    faq_jsx = (
        f'\n        <FaqSection\n'
        f'          schemaId="{slug}"\n'
        f'          items={{[\n{items_jsx}\n          ]}}\n'
        f'        />\n      </main>'
    )

    # 3. Replace first </main> only if not yet inserted
    if "<FaqSection" not in text:
        text = text.replace("      </main>", faq_jsx, 1)

    # 4. Apply long-title fixes
    for old, new in LONG_TITLE_FIXES.get(f"{fname_stem}.tsx", []):
        text = text.replace(old, new)

    fpath.write_text(text)
    print(f"updated {fpath}")

print("done")
