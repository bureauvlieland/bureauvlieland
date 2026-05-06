// Storytelling-laag voor voorbeeldprogramma's. Gekoppeld aan template.id.
// Tone-of-voice: formeel ('u'), wervend, eilandgevoel.

export type ProgramTemplateCopy = {
  hook: string; // korte krachtige openingszin
  story: string[]; // 1-3 alinea's
  highlights: string[]; // 4-6 bullets
  forWhom: string;
  vibe: string[]; // 3 sfeerwoorden
  practical: string[]; // praktische tips
  featured?: boolean; // toon "Nieuw"-badge op overzicht
};

export const PROGRAM_TEMPLATE_COPY: Record<string, ProgramTemplateCopy> = {
  "eilanddag-compleet": {
    hook: "Eén dag, het complete eilandgevoel — van zeehondentocht tot strandspektakel.",
    story: [
      "U vaart 's ochtends weg van Harlingen en zet voet op een eiland dat onmiddellijk zijn rust en ruimte deelt. Met de fiets onder u verkent u de duinen, het strand en de Waddenzee — alles op handbereik, niets gehaast.",
      "Tussendoor geniet u van een verzorgde lunch op locatie, ontmoet u onderweg de zeehonden en sluit u af met een sportieve activiteit op het strand. Aan het einde van de dag stapt u tevreden, vol zon en zilte lucht weer aan boord van de boot terug.",
    ],
    highlights: [
      "Zeehondentocht over het Wad",
      "Verzorgde lunch op een mooie locatie",
      "Strandspektakel als sportieve afsluiter",
      "Fietshuur de hele dag inbegrepen",
      "Eén dag, geen overnachting nodig",
    ],
    forWhom:
      "Bedrijfsuitjes, teamuitjes en groepen vrienden van 15 tot 80 personen die in één dag het beste van Vlieland willen ervaren.",
    vibe: ["Actief", "Ontdekken", "Buiten"],
    practical: [
      "Volledig dagprogramma — vroeg vertrek vanuit Harlingen, retour eind van de middag.",
      "Activiteiten zijn weersafhankelijk; bij slecht weer bieden wij alternatieven aan.",
      "Geschikte (sport)kleding en goed zittend schoeisel aanbevolen.",
    ],
  },

  "chill-eilanddag": {
    hook: "Geen strak schema, wel alles geregeld — een eiland in uw eigen tempo.",
    story: [
      "Soms is de mooiste dag de dag waarop niets moet. U fietst rustig over het eiland, drinkt koffie waar het terras u aanstaat en luncht op een mooie plek aan zee.",
      "Wij regelen het kader — overtocht, fiets, lunch — u bepaalt het ritme. Ideaal voor groepen die eens écht willen bijkomen, zonder horloge.",
    ],
    highlights: [
      "Veel vrije tijd om het eiland zelf te ontdekken",
      "Optionele begeleide fietstocht voor wie dat wil",
      "Verzorgde lunch op een sfeervolle locatie",
      "Fiets de hele dag inbegrepen",
      "Geen druk programma — geen stress",
    ],
    forWhom:
      "Kleine teams (10–30 personen) en vriendengroepen die rust, ruimte en kwaliteit van leven boven een vol programma stellen.",
    vibe: ["Rustig", "Vrij", "Genieten"],
    practical: [
      "Aankomst rond 10:00, vertrek vanaf circa 17:00.",
      "Goed te combineren met een korte begeleide fietstocht in de ochtend.",
      "Bij regenweer adviseren wij vooraf een binnenlocatie als reserve.",
    ],
  },

  "actieve-eilanddag-voc": {
    hook: "Wind in het haar, zand onder de voeten — een dag vol actie aan de Noordzee.",
    story: [
      "Op het brede strand van Vlieland geeft de wind direction aan uw dag. U leert powerkiten, slaat een balletje op de unieke beach golfbaan en geniet daartussen van een lunch met uitzicht over zee.",
      "Een dag waarin uw team samen lacht, samen valt en samen wint — sportief, energiek en nét buiten de comfortzone.",
    ],
    highlights: [
      "Powerkiten / vliegeren onder begeleiding",
      "Beach Golf op het strand",
      "Lunch op locatie tussen de activiteiten door",
      "Volledig begeleide activiteiten door VOC Vlieland",
      "Fiets de hele dag inbegrepen",
    ],
    forWhom:
      "Sportieve teams en actieve groepen van 15 tot 60 personen die houden van wind, zand en gezonde wedijver.",
    vibe: ["Sportief", "Energiek", "Outdoor"],
    practical: [
      "Activiteiten vinden plaats op het strand — kleed u op weer en wind.",
      "Bij windstil weer wisselen we powerkiten om voor een passend alternatief.",
      "Reservekleding en handdoek aan te raden.",
    ],
  },

  "avontuur-ontspanning": {
    hook: "Twee dagen die balans brengen: actie aan zee en rust onder de sterren.",
    story: [
      "Dag één staat in het teken van avontuur. U raft door de branding, geniet van een verzorgde borrel en sluit af met een uitgebreid grillmaster-diner — de geur van houtskool en zee in uw neus.",
      "Dag twee draait om beleving en bezinning. Met een gids fietst u over het eiland, ontmoet u de zeehonden en herstelt u tijdens een ontspannende strandyoga voordat u tevreden de boot terug pakt.",
    ],
    highlights: [
      "Branding raften onder professionele begeleiding",
      "Grillmaster-diner met streekproducten",
      "Begeleide fietstocht en zeehondentocht",
      "Strandyoga als rustpunt op dag twee",
      "Inclusief overnachting tussen de twee dagen",
    ],
    forWhom:
      "Teams en vriendengroepen van 15 tot 60 personen die avontuur en ontspanning willen combineren in een tweedaagse beleving.",
    vibe: ["Avontuur", "Verbinding", "Buitenleven"],
    practical: [
      "Tweedaags programma met overnachting op het eiland.",
      "Branding raften is weersafhankelijk; we bieden altijd een passend alternatief.",
      "Neem passende sport- en zwemkleding mee, plus een warme laag voor de avond.",
    ],
  },

  "culinaire-ontdekking": {
    hook: "Twee dagen proeven, ontdekken en delen — Vlieland voor smaakliefhebbers.",
    story: [
      "Vlieland is een eiland van makers. U bezoekt brouwerij Fortuna, geniet van Italiaanse shared dining bij Oliva en proeft tijdens een exclusieve rondleiding de bijzondere kazen uit de Kaasbunker.",
      "Tussen de bezoeken door fietst u langs duinen en bos, geniet u van een luxe lunchbuffet en heeft u alle tijd om in uw eigen tempo bij te komen. Een tweedaagse die smaakt naar méér.",
    ],
    highlights: [
      "Rondleiding & proeverij Brouwerij Fortuna",
      "Italiaanse shared dining bij Oliva",
      "Exclusieve rondleiding Kaasbunker met proeverij",
      "Luxe lunchbuffet op dag twee",
      "Begeleide fietstocht en koffie & gebak aan boord",
    ],
    forWhom:
      "Foodies, culinaire reisgezelschappen en bedrijven (15–40 personen) die hechten aan smaak, kwaliteit en het verhaal achter het product.",
    vibe: ["Culinair", "Ambachtelijk", "Sfeervol"],
    practical: [
      "Tweedaags programma met overnachting op het eiland.",
      "Geef dieetwensen vooraf door — onze partners houden hier graag rekening mee.",
      "Neem comfortabele schoenen mee voor de fiets- en wandelmomenten.",
    ],
  },

  "wellness-natuur": {
    hook: "Adem in, adem uit — twee dagen oprecht opladen tussen duin en zee.",
    story: [
      "U start met yoga op het strand, vaart langs de zeehonden en gunt uzelf een sauna-ervaring tussen de duinen. De stilte van Vlieland werkt onmiddellijk: schouders zakken, hoofden worden lichter.",
      "Een tweedaagse waarin uw team samen ontspant, samen ademt en samen terugkomt op datgene wat er werkelijk toe doet. Optioneel uit te breiden met een luxe wellness-behandeling.",
    ],
    highlights: [
      "Strandyoga als opening van het programma",
      "Zeehondentocht over het Wad",
      "Sauna- en wellness-ervaring tussen de duinen",
      "Optionele luxe behandeling",
      "Verzorgde lunch op locatie",
    ],
    forWhom:
      "Teams (10–30 personen) die echt willen opladen, en vriendengroepen die rust, gezondheid en welzijn vooropstellen.",
    vibe: ["Rust", "Welzijn", "Natuur"],
    practical: [
      "Tweedaags programma met overnachting op het eiland.",
      "Neem makkelijke kleding, badkleding en een handdoek mee.",
      "De wellness-behandeling is optioneel en wordt vooraf met u afgestemd.",
    ],
  },

  katalys: {
    hook: "Drie dagen Vlieland — avontuur, cultuur en culinaire hoogtepunten in één belevenis.",
    story: [
      "Drie volle dagen waarin u Vlieland in al zijn facetten leert kennen. U fietst, raft, eet, lacht, danst en ontspant — er is ruimte voor alles.",
      "Van het strandspektakel op dag één, via de zeehondentocht en brouwerijproeverij op dag twee, tot een ontspannen ochtend op dag drie. Het complete eilandprogramma voor groepen die echt iets willen meemaken.",
    ],
    highlights: [
      "Strandspektakel met grillmaster-diner",
      "Begeleide fietstocht en zeehondentocht",
      "Rondleiding Brouwerij Fortuna",
      "Italiaanse shared dining bij Oliva",
      "Exclusieve feestavond in Café Boven",
      "Vrije tijd op de slotdag",
    ],
    forWhom:
      "Bedrijfsuitjes, congressen en grote groepen (20–80 personen) die meerdere dagen samen optrekken en het maximale uit Vlieland willen halen.",
    vibe: ["Compleet", "Energiek", "Onvergetelijk"],
    practical: [
      "Driedaags programma met twee overnachtingen.",
      "Geef voorkeuren voor activiteiten en dieetwensen vooraf door.",
      "Programma is volledig op maat aan te passen aan uw groep.",
    ],
  },

  "wellness-natuur-3d": {
    hook: "Drie dagen volledig in balans — wellness, natuur en het ruige Vliehors.",
    story: [
      "Een verlengde wellness-belevenis voor wie echt de tijd wil nemen om los te komen. Yoga, sauna en een persoonlijke behandeling worden afgewisseld met natuurmomenten zoals een zeehondentocht en een tocht met de Vliehors Expres over het westelijke strand.",
      "Drie dagen waarin niets moet en alles kan. U keert terug met een hoofd vol stilte en een lichaam vol energie.",
    ],
    highlights: [
      "Strandyoga en sauna tussen de duinen",
      "Persoonlijke wellness-behandeling",
      "Zeehondentocht over het Wad",
      "Vliehors Expres over het westelijke strand",
      "Twee overnachtingen op het eiland",
    ],
    forWhom:
      "Kleine teams en groepen (8–24 personen) die diepgaand willen opladen, met gezondheid en welzijn als rode draad.",
    vibe: ["Mindful", "Natuur", "Verstilling"],
    practical: [
      "Driedaags programma met twee overnachtingen.",
      "Vliehors Expres is afhankelijk van getij en weer; we plannen flexibel.",
      "Neem makkelijke kleding, badkleding en goede wandelschoenen mee.",
    ],
  },

  "prive-eilanddag-regina-andrea": {
    featured: true,
    hook: "Uw eigen schip, uw eigen dag — exclusief naar Vlieland met de Regina Andrea.",
    story: [
      "U stapt aan boord van uw eigen schip, de Regina Andrea, en wordt ontvangen met koffie en wat lekkers. Zonder dienstregeling, zonder drukte — alleen u en uw groep, op weg naar Vlieland.",
      "Op het eiland fietst u over duinen en strand, geniet u van een verzorgde lunch en heeft u alle tijd om Vlieland in uw eigen tempo te ontdekken. Aan het einde van de dag staat aan boord een warm buffet voor u klaar — terwijl u nageniet, varen wij u in alle rust terug naar Harlingen.",
    ],
    highlights: [
      "Privévaart Harlingen → Vlieland → Harlingen met de Regina Andrea",
      "Flexibele vertrektijden — u bepaalt het ritme",
      "Ontvangst met koffie en lekkers aan boord",
      "Fiets aan boord en op het eiland inbegrepen",
      "Begeleide fietstocht en lunch op het eiland",
      "Warm buffet aan boord tijdens de terugvaart",
    ],
    forWhom:
      "Bedrijfsuitjes, familiefeesten, vriendengroepen en relatie-evenementen vanaf circa 30 personen die exclusiviteit, comfort en gastvrijheid zoeken.",
    vibe: ["Exclusief", "Verzorgd", "Op maat"],
    practical: [
      "Eendaags programma — vertrektijden in overleg.",
      "Inclusief havengeld en toeristenbelasting.",
      "Buffet en menu worden vooraf met u afgestemd; dieetwensen welkom.",
      "Minimale groepsgrootte ca. 30 personen — vraag de mogelijkheden op.",
    ],
  },
};

export const getTemplateCopy = (templateId: string | undefined): ProgramTemplateCopy | null => {
  if (!templateId) return null;
  return PROGRAM_TEMPLATE_COPY[templateId] || null;
};
