/**
 * Verdiepende, unieke content per activiteit (SEO + AI-citatie).
 *
 * Alleen de tien belangrijkste activiteiten hebben hier een entry.
 * Ontbreekt een slug, dan valt `/activiteit/:slug` terug op de
 * standaardweergave uit de database.
 *
 * Doel: elke pagina >400 unieke woorden, met praktische feiten die
 * bezoekers écht zoeken (duur, seizoen, weersafhankelijkheid, wat mee
 * te nemen, groepsgrootte) en een korte FAQ voor rich results.
 */
import type { FaqItem } from "@/components/FaqSection";

export type ActivityContent = {
  /** Eén citeerbare samenvattende zin (AI Overviews / ChatGPT). */
  summary: string;
  /** Verdiepende alinea's — unieke tekst, geen herhaling van de DB-omschrijving. */
  paragraphs: string[];
  /** Praktische feiten als label/waarde-paren. */
  practical: { label: string; value: string }[];
  /** Wat neem je mee / waar houd je rekening mee. */
  goodToKnow?: string[];
  faq: FaqItem[];
};

export const activityContent: Record<string, ActivityContent> = {
  zeehondentocht: {
    summary:
      "De zeehondentocht op Vlieland duurt ongeveer 45 minuten, vertrekt vanuit de haven van Oost-Vlieland en vaart langs de zandbanken waar gewone en grijze zeehonden liggen te rusten.",
    paragraphs: [
      "Rondom Vlieland liggen de zandplaten van de Waddenzee, en juist daar komen zeehonden bij laag water uit het water om te rusten en op te warmen. Vanaf het water kom je dichterbij dan vanaf het strand ooit lukt: de boot houdt respectvol afstand, maar met een verrekijker of een telelens zie je de dieren duidelijk liggen. Je treft er twee soorten aan: de gewone zeehond (kleiner, ronde kop) en de grijze zeehond (fors, met een langgerekte 'paardenkop').",
      "De tocht wordt gepland op het getij, niet op de klok. De schipper kiest een vertrektijd rond laagwater, want alleen dan liggen de platen droog. Voor groepen betekent dat: het vaarmoment is leidend, en de rest van het dagprogramma bouwen wij daaromheen. Dat is precies het soort puzzel dat wij voor u oplossen — u krijgt één programma en één factuur.",
      "Onderweg vertelt de schipper over het ontstaan van de Waddenzee, de werking van eb en vloed en over het herstel van de zeehondenpopulatie in de afgelopen decennia. Het is daarmee net zo goed een korte natuurexcursie als een boottocht. Doordat de tocht kort is en u aan boord blijft, is dit voor gezelschappen met kinderen een laagdrempelige manier om het wad van dichtbij te beleven.",
    ],
    practical: [
      { label: "Duur", value: "Circa 45 minuten varen" },
      { label: "Vertrekpunt", value: "Reddingbootsteiger, jachthaven Oost-Vlieland" },
      { label: "Prijs", value: "€32,50 p.p. — hele boot exclusief €425" },
      { label: "Groepsgrootte", value: "10 tot 40 personen" },
      { label: "Seizoen", value: "Voorjaar t/m najaar; afhankelijk van getij" },
      { label: "Weersafhankelijk", value: "Ja — bij harde wind kan de tocht vervallen" },
    ],
    goodToKnow: [
      "Neem een verrekijker mee; de boot houdt bewust afstand van de dieren.",
      "Op het water is het altijd kouder dan aan wal — een winddichte jas is geen overbodige luxe.",
      "Zeehonden zien is nooit gegarandeerd, maar in de praktijk is de kans zeer groot rond laagwater.",
    ],
    faq: [
      {
        question: "Hoe lang duurt een zeehondentocht op Vlieland?",
        answer:
          "De vaartocht duurt ongeveer 45 minuten. Reken met in- en uitstappen en de uitleg vooraf op ruim een uur in uw programma.",
      },
      {
        question: "Zie je gegarandeerd zeehonden?",
        answer:
          "Een garantie geeft niemand — het zijn wilde dieren. De tocht wordt echter rond laagwater gepland, wanneer de zeehonden op de droogvallende zandplaten liggen. In de praktijk worden er vrijwel altijd zeehonden gespot.",
      },
      {
        question: "Kan de zeehondentocht met een grote groep?",
        answer:
          "De tocht wordt geboekt vanaf 10 personen, met maximaal 40 deelnemers per afvaart. Een exclusieve afvaart met de hele boot kost €425. Grotere gezelschappen splitsen we over twee vaarten; wij stemmen dat af en verwerken het in uw programma.",
      },
      {
        question: "Wat gebeurt er bij slecht weer?",
        answer:
          "Bij harde wind of ruwe zee beslist de schipper of er gevaren wordt. Vervalt de tocht, dan brengen wij die niet in rekening en schuiven we waar mogelijk naar een alternatief moment of een andere activiteit.",
      },
    ],
  },

  wadloopexcursie: {
    summary:
      "Een begeleide wadloopexcursie op Vlieland gaat onder leiding van een gecertificeerde gids de bodem van de Waddenzee op, duurt doorgaans twee tot drie uur en start op een tijdstip dat door het getij wordt bepaald.",
    paragraphs: [
      "Wadlopen is de enige manier om het werelderfgoed Waddenzee letterlijk onder je voeten te voelen. Bij laagwater valt een landschap droog dat er twee keer per dag anders uitziet: geulen, slikvlaktes, mosselbanken en priel na priel. Een gids laat zien wat er leeft — wadpieren, kokkels, garnalen, krabben — en legt uit waarom dit gebied zo bijzonder is dat het op de UNESCO-lijst staat.",
      "Zonder gids is het wad levensgevaarlijk: het tij komt sneller op dan mensen inschatten en mist kan binnen minuten het zicht wegnemen. Daarom werken wij uitsluitend met gecertificeerde wadgidsen die het gebied rond Vlieland dagelijks kennen. Zij bepalen route en starttijd op basis van de getijdentabel en de actuele weersverwachting.",
      "Voor groepen is wadlopen een verrassend sterke teamactiviteit. Je loopt in een tempo waarin iedereen mee kan, je helpt elkaar door de geulen en je praat onderweg anders dan in een vergaderzaal. Veel bedrijven combineren de excursie daarom met een lunch of borrel erna — modder eerst, verhalen daarna.",
    ],
    practical: [
      { label: "Duur", value: "Doorgaans 2 tot 3 uur inclusief uitleg" },
      { label: "Starttijd", value: "Bepaald door het getij, niet vrij te kiezen" },
      { label: "Seizoen", value: "Circa april t/m oktober" },
      { label: "Conditie", value: "Redelijke basisconditie vereist; het lopen kost energie" },
      { label: "Begeleiding", value: "Altijd met gecertificeerde wadgids" },
    ],
    goodToKnow: [
      "Draag oude sportschoenen die vast om de voet zitten — laarzen zuigen vast in de modder.",
      "Neem droge kleding en een handdoek mee voor na afloop.",
      "Bij dichte mist of onweer gaat de excursie niet door; dat is een veiligheidsbeslissing van de gids.",
    ],
    faq: [
      {
        question: "Kun je vanaf Vlieland wadlopen?",
        answer:
          "Ja, er worden begeleide wadexcursies over de wadplaten rond het eiland georganiseerd. Doorlopen naar het vasteland is vanaf Vlieland niet mogelijk; het gaat om excursies op en rond de platen.",
      },
      {
        question: "Hoe zwaar is een wadloopexcursie?",
        answer:
          "Lopen door slik kost meer energie dan lopen over een pad. Een redelijke basisconditie volstaat; de gids houdt het tempo van de langzaamste deelnemer aan.",
      },
      {
        question: "Waarom staat de starttijd niet vast?",
        answer:
          "Het wad valt alleen rond laagwater droog en dat verschuift elke dag ongeveer vijftig minuten. De gids bepaalt de starttijd aan de hand van de getijdentabel; wij bouwen het programma daaromheen.",
      },
      {
        question: "Wat moet ik aantrekken?",
        answer:
          "Oude sportschoenen die goed vastzitten, een korte broek of opstroopbare broek, en een winddichte jas. Neem droge kleding mee voor na afloop.",
      },
    ],
  },

  "vliehors-expres": {
    summary:
      "De Vliehors Expres rijdt in ongeveer twee uur met een omgebouwde legertruck over de Vliehors, de twintig vierkante kilometer grote zandvlakte aan de westkant van Vlieland die de Sahara van het Noorden wordt genoemd.",
    paragraphs: [
      "De Vliehors is het grootste zandstrand van Europa en normaal gesproken niet zomaar toegankelijk: het gebied wordt deels gebruikt als militair oefenterrein en is verder beschermd natuurgebied. Met de Vliehors Expres — een oude legertruck met ramen — rijd je er wél overheen, onder begeleiding van een chauffeur-gids die het terrein op zijn duimpje kent.",
      "Onderweg passeer je de wrakstukken en de betonnen doelen van het schietterrein, kom je langs plekken waar zeehonden op de zandbanken liggen en rijd je naar de Posthuys-zijde van het eiland. De gids vertelt over strandingen, over de verdwenen dorpen van West-Vlieland en over hoe wind en zee dit landschap elk jaar opnieuw vormgeven.",
      "Omdat het gebied leeg en weids is, werkt de rit uitstekend als opening van een groepsdag: iedereen zit samen in één truck, er is niets dat afleidt, en aan het eindpunt kun je uitstappen voor een strandwandeling. Voor gezelschappen die het exclusief willen, is er een variant waarbij de hele truck voor uw groep alleen rijdt.",
    ],
    practical: [
      { label: "Duur", value: "Circa 2 uur" },
      { label: "Vertrekpunt", value: "Oost-Vlieland, in overleg" },
      { label: "Seizoen", value: "Het hele jaar door, weersafhankelijk" },
      { label: "Toegankelijkheid", value: "Instappen vergt een opstapje; meld beperkingen vooraf" },
      { label: "Groepen", value: "Ook exclusief te boeken voor één gezelschap" },
    ],
    goodToKnow: [
      "De Vliehors is militair oefenterrein; op oefendagen kan de route worden aangepast.",
      "Het waait er vrijwel altijd — neem een jas mee, ook op zomerse dagen.",
      "Raap niets op wat op munitie of metaal lijkt en blijf bij de groep.",
    ],
    faq: [
      {
        question: "Wat is de Vliehors Expres?",
        answer:
          "Een omgebouwde legertruck die bezoekers over de Vliehors rijdt, de grote zandvlakte aan de westkant van Vlieland. De rit duurt ongeveer twee uur en wordt begeleid door een chauffeur-gids.",
      },
      {
        question: "Kun je de Vliehors ook zelf op?",
        answer:
          "Delen van de Vliehors zijn afgesloten omdat het een militair oefenterrein en beschermd natuurgebied is. Met de Vliehors Expres komt u legaal en veilig op plekken die anders gesloten blijven.",
      },
      {
        question: "Is de rit geschikt voor grote groepen?",
        answer:
          "Ja. De truck neemt een flinke groep tegelijk mee en kan voor gezelschappen exclusief worden ingezet, zodat de gids het verhaal helemaal op uw groep afstemt.",
      },
      {
        question: "Gaat de tocht bij regen door?",
        answer:
          "In de regel wel — u zit in de truck. Alleen bij storm of bij militaire oefeningen kan de rit worden verplaatst of aangepast.",
      },
    ],
  },

  "powerkiten-vliegeren": {
    summary:
      "Powerkiten op het strand van Vlieland duurt ongeveer anderhalf uur, gebeurt met tweelijns- of vierlijnsmatrassen onder begeleiding van een instructeur en vraagt geen voorkennis.",
    paragraphs: [
      "Op het brede Noordzeestrand van Vlieland staat vrijwel altijd wind, en dat maakt het eiland een van de betere plekken in Nederland om te powerkiten. Je begint met een kleine kite om het stuurgevoel te pakken te krijgen, en werkt op naar een groter model dat je echt over het zand trekt. De instructeur legt eerst het windvenster uit: waar in de lucht de kite kracht maakt en waar juist niet.",
      "Het aantrekkelijke van powerkiten als groepsactiviteit is dat de leercurve steil is. Binnen een kwartier stuurt iedereen zijn eigen kite, en na een half uur staan de eerste deelnemers te slippen over het strand. Dat levert precies de mix van spanning en gelach op waar teamdagen om vragen — zonder dat je sportief hoeft te zijn.",
      "De activiteit is uitstekend te combineren met blokarten of branding raften op hetzelfde stuk strand; het materiaal en de begeleiding staan dan al klaar. Wij plannen dat als één blok in het dagprogramma, inclusief het fietsen naar het strand en terug.",
    ],
    practical: [
      { label: "Duur", value: "Circa 1,5 uur inclusief instructie" },
      { label: "Locatie", value: "Noordzeestrand Vlieland" },
      { label: "Voorkennis", value: "Niet nodig — beginners zijn welkom" },
      { label: "Seizoen", value: "Het hele jaar, mits er voldoende wind staat" },
      { label: "Combineert met", value: "Blokarten, branding raften, strandspektakel" },
    ],
    goodToKnow: [
      "Bij windstilte of juist storm gaat de activiteit niet door; de instructeur beslist ter plekke.",
      "Draag kleding die tegen zand en zeewater kan en neem een zonnebril mee.",
      "Zonnebrand is ook bij bewolking verstandig: op het strand reflecteert het licht sterk.",
    ],
    faq: [
      {
        question: "Moet je ervaring hebben om te powerkiten?",
        answer:
          "Nee. De instructeur begint met een kleine kite en legt het windvenster uit. Vrijwel iedereen stuurt binnen een kwartier zelfstandig.",
      },
      {
        question: "Hoeveel wind is er nodig?",
        answer:
          "Er is een lichte tot matige wind nodig. Bij windstilte kan er niet gevlogen worden en bij storm is het onveilig; in beide gevallen verplaatsen we de activiteit.",
      },
      {
        question: "Vanaf welke leeftijd kan powerkiten?",
        answer:
          "Kinderen vanaf ongeveer tien jaar kunnen met een kleinere kite meedoen. De instructeur past de maat van de kite aan op gewicht en ervaring.",
      },
    ],
  },

  surfles: {
    summary:
      "Surfles op Vlieland duurt ongeveer 2,5 uur, is inclusief wetsuit en board, en wordt gegeven op het Noordzeestrand door instructeurs voor zowel beginners als gevorderden.",
    paragraphs: [
      "Het Noordzeestrand van Vlieland loopt flauw af, waardoor de golven relatief ver uit de kust al breken. Dat is ideaal voor beginners: je staat lang op stahoogte en hoeft niet ver te peddelen om een golf te pakken. De les begint op het droge met de pop-up, de veiligheidsregels en de stroming, en gaat daarna het water in.",
      "Een groep wordt opgesplitst naar niveau, zodat wie al eens gesurft heeft niet hoeft te wachten op de eerste pop-up van de rest. Wetsuits zijn inbegrepen — ook in het voorjaar en najaar is het water met een goed pak prima te doen.",
      "Voor bedrijfsgroepen is surfles een activiteit waarbij hiërarchie snel verdwijnt: iedereen valt evenveel om. Plan er wel voldoende tijd omheen in: omkleden, douchen en warm worden kost samen al gauw een half uur extra. Wij houden daar in het programma rekening mee.",
    ],
    practical: [
      { label: "Duur", value: "Circa 2,5 uur inclusief instructie" },
      { label: "Inbegrepen", value: "Wetsuit en surfboard" },
      { label: "Niveau", value: "Beginners en gevorderden, in aparte groepjes" },
      { label: "Seizoen", value: "Voorjaar t/m najaar" },
      { label: "Zwemvaardigheid", value: "Vereist — deelnemers moeten kunnen zwemmen" },
    ],
    goodToKnow: [
      "Neem een handdoek, badkleding voor onder het pak en droge kleding mee.",
      "Reken op een half uur extra voor omkleden en opwarmen na afloop.",
      "Bij onweer of een gevaarlijke stroming besluit de instructeur de les te verplaatsen.",
    ],
    faq: [
      {
        question: "Is surfles op Vlieland geschikt voor beginners?",
        answer:
          "Ja. Het strand loopt flauw af, waardoor je lang op stahoogte staat. De les start op het droge met de basistechniek voordat u het water in gaat.",
      },
      {
        question: "Wordt een wetsuit geleverd?",
        answer:
          "Ja, wetsuit en board zijn bij de les inbegrepen. Neem zelf badkleding, een handdoek en droge kleding mee.",
      },
      {
        question: "Moet je kunnen zwemmen?",
        answer:
          "Ja, zwemvaardigheid is een voorwaarde. De instructeur blijft in het water bij de groep en het lesgebied ligt op stahoogte.",
      },
    ],
  },

  blokarten: {
    summary:
      "Blokarten op Vlieland is strandzeilen in een driewielige kar met zeil; een sessie duurt ongeveer een uur, inclusief instructie, en is te doen zonder ervaring.",
    paragraphs: [
      "Een blokart is een lage driewieler met een zeil, waarmee je over het harde, natte zand langs de vloedlijn racet. Sturen doe je met je voeten, snelheid regel je met het touw waarmee je het zeil aantrekt of laat vieren. Dat klinkt technisch, maar in de praktijk rijdt vrijwel iedereen na tien minuten instructie zelfstandig een baan.",
      "Doordat je vlak boven het zand zit, voelt vijfentwintig kilometer per uur als het dubbele. Er zit een natuurlijke competitie in: de baan wordt met pylonen uitgezet en groepen gaan onherroepelijk tijden vergelijken. Voor teamdagen is dat een sterke motor — het is fysiek licht maar mentaal fanatiek.",
      "Blokarten vraagt wind én een strand dat breed genoeg is. Op Vlieland is dat op de meeste dagen geen probleem, maar rond springtij of bij aanhoudende windstilte kan de activiteit worden verschoven. De instructeur beslist dat op de dag zelf; wij zorgen dan voor een passend alternatief in hetzelfde tijdvak.",
    ],
    practical: [
      { label: "Duur", value: "Circa 1 uur" },
      { label: "Locatie", value: "Hard zand langs de vloedlijn, Noordzeestrand" },
      { label: "Voorkennis", value: "Niet nodig" },
      { label: "Fysieke belasting", value: "Laag — je zit in de kar" },
      { label: "Weersafhankelijk", value: "Ja, er is wind én voldoende strandbreedte nodig" },
    ],
    goodToKnow: [
      "Draag een zonnebril of sportbril: opspattend zand is het enige echte ongemak.",
      "Helm en instructie zijn onderdeel van de activiteit.",
      "Ook geschikt voor deelnemers die niet sportief zijn — je zit, je rent niet.",
    ],
    faq: [
      {
        question: "Wat is blokarten precies?",
        answer:
          "Blokarten is strandzeilen in een lage driewielige kar met een zeil. U stuurt met de voeten en regelt de snelheid met het zeiltouw. Een sessie duurt ongeveer een uur inclusief instructie.",
      },
      {
        question: "Hoe hard ga je met een blokart?",
        answer:
          "Afhankelijk van de wind haalt u al snel twintig tot dertig kilometer per uur. Doordat u vlak boven het zand zit, voelt dat aanzienlijk sneller.",
      },
      {
        question: "Is blokarten gevaarlijk?",
        answer:
          "Nee, mits u de instructie volgt. U draagt een helm, de baan is met pylonen afgezet en de instructeur houdt toezicht. Het zwaartepunt van de kar ligt zeer laag.",
      },
    ],
  },

  vuurtorenbezoek: {
    summary:
      "Het vuurtorenbezoek op Vlieland duurt ongeveer een uur, gaat via een trap naar boven en levert bij helder weer uitzicht op het hele eiland, de Waddenzee en de buureilanden.",
    paragraphs: [
      "De vuurtoren van Vlieland staat op het hoogste duin van het eiland, waardoor je al vanaf de voet ver kijkt. Boven op het balkon zie je in één blik hoe smal Vlieland eigenlijk is: aan de ene kant de Noordzee met de eindeloze branding, aan de andere kant het wad met zijn geulen en platen. Bij helder weer herken je Terschelling en Texel aan de horizon.",
      "De beklimming gaat via een trap; er is geen lift. Dat maakt het bezoek minder geschikt voor wie slecht ter been is, maar de klim is met rustpunten goed te doen. Boven is beperkt ruimte, dus grotere groepen gaan in kleinere clusters naar boven — daar houden wij in de planning rekening mee.",
      "Als programmaonderdeel werkt het vuurtorenbezoek het best aan het begin van een verblijf: het geeft deelnemers meteen gevoel voor de schaal en de indeling van het eiland, waardoor de rest van het programma logischer voelt. Combineer het met een fietstocht die vanaf de vuurtoren het dorp in of de duinen door gaat.",
    ],
    practical: [
      { label: "Duur", value: "Circa 1 uur" },
      { label: "Locatie", value: "Hoogste duin bij Oost-Vlieland" },
      { label: "Toegankelijkheid", value: "Alleen via trap, geen lift" },
      { label: "Groepen", value: "Boven beperkte ruimte; in clusters naar boven" },
      { label: "Beste moment", value: "Helder weer; begin van het verblijf" },
    ],
    goodToKnow: [
      "Op het balkon staat vrijwel altijd wind — houd petten en losse spullen vast.",
      "Niet geschikt voor deelnemers met hoogtevrees of ernstige knieklachten.",
      "Neem een camera of verrekijker mee; bij helder zicht ziet u de buureilanden.",
    ],
    faq: [
      {
        question: "Kun je de vuurtoren van Vlieland beklimmen?",
        answer:
          "Ja, tijdens een begeleid bezoek gaat u via de trap naar boven. Er is geen lift. Het bezoek duurt inclusief uitleg ongeveer een uur.",
      },
      {
        question: "Wat zie je vanaf de vuurtoren?",
        answer:
          "Bij helder weer overziet u het hele eiland, de Noordzee, de Waddenzee met de zandplaten en aan de horizon Terschelling en Texel.",
      },
      {
        question: "Is het bezoek geschikt voor grote groepen?",
        answer:
          "Boven is de ruimte beperkt, dus grote gezelschappen gaan in kleinere groepjes naar boven. Wij verwerken die tijdsblokken in uw programma.",
      },
    ],
  },

  "fietstocht-met-begeleiding": {
    summary:
      "Een begeleide fietstocht over Vlieland duurt ongeveer twee uur, volgt de verharde fietspaden door duin, bos en dorp, en wordt geleid door een eilandgids die onderweg het verhaal van het eiland vertelt.",
    paragraphs: [
      "Vlieland is autoluw en telt tientallen kilometers fietspad, dus de fiets is hier geen alternatief maar het normale vervoermiddel. Tijdens een begeleide tocht rijd je in rustig tempo van het dorp naar het bos, langs de duinen en naar uitzichtpunten die je met een kaartje in de hand zelden vindt.",
      "Wat de tocht onderscheidt van zelf rondfietsen is het verhaal. De gids vertelt over het verdwenen dorp West-Vlieland dat door de zee is opgeslokt, over de bosaanplant die het stuifzand moest vastleggen, en over hoe een eiland met ruim duizend inwoners in de zomer tienduizenden gasten opvangt. Daar hoort ook de minder romantische kant bij: drinkwater, afvalverwerking en woningnood op een eiland.",
      "De route wordt afgestemd op de groep. Met een gezelschap dat stevig doortrapt gaan we verder het eiland op; met een gemengde groep blijven we dichter bij het dorp en lassen we meer stops in. E-bikes zijn beschikbaar, wat het verschil in tempo binnen een groep grotendeels wegneemt.",
    ],
    practical: [
      { label: "Duur", value: "Circa 2 uur" },
      { label: "Afstand", value: "Ongeveer 12 tot 18 km, aan te passen op de groep" },
      { label: "Ondergrond", value: "Verharde fietspaden" },
      { label: "Fietsen", value: "Huurfietsen en e-bikes los bij te boeken" },
      { label: "Seizoen", value: "Het hele jaar door" },
    ],
    goodToKnow: [
      "Regen op Vlieland komt zijdelings — een winddichte jas werkt beter dan een paraplu.",
      "Met e-bikes blijft een gemengde groep makkelijker bij elkaar.",
      "Wij reserveren de fietsen vooraf; in het hoogseizoen is dat geen overbodige luxe.",
    ],
    faq: [
      {
        question: "Hoe lang duurt een begeleide fietstocht op Vlieland?",
        answer:
          "Ongeveer twee uur, met een afstand van grofweg twaalf tot achttien kilometer. De route wordt aangepast op het tempo van de groep.",
      },
      {
        question: "Zijn er fietsen inbegrepen?",
        answer:
          "De begeleiding en de route zijn inbegrepen; huurfietsen en e-bikes boekt u er los bij. Wij reserveren ze vooraf en zetten ze op het juiste moment in het programma.",
      },
      {
        question: "Kan de fietstocht met een grote groep?",
        answer:
          "Ja. Bij grotere gezelschappen zetten we meerdere gidsen in, zodat elke subgroep het verhaal goed kan volgen en de groep niet uitwaaiert over het fietspad.",
      },
    ],
  },

  "bezoek-het-bunkermuseum": {
    summary:
      "Bunkermuseum Wn 12H op Vlieland is sinds 2020 open voor bezoekers; een rondleiding door de gerestaureerde Duitse verdedigingsbunker uit de Tweede Wereldoorlog duurt ongeveer anderhalf uur.",
    paragraphs: [
      "Vlieland lag in de Tweede Wereldoorlog aan de Atlantikwall, de Duitse verdedigingslinie langs de Noordzeekust. Van dat verleden staan nog altijd bunkers in de duinen. Steunpunt Wn 12H is er één van en werd door vrijwilligers uitgegraven en ingericht als museum, met originele apparatuur, uniformen en objecten die op het eiland zijn gevonden.",
      "De rondleiding gaat over meer dan techniek. Je hoort hoe de bezetting het dagelijks leven op een klein eiland veranderde, wat het betekende voor de eilanders die er bleven wonen, en hoe de kustverdediging werkte in samenhang met de posten op Terschelling en Texel. Voor veel bezoekers is dat het onverwachte deel van het bezoek: de geschiedenis van het eiland zelf, niet alleen die van de oorlog.",
      "Binnen in de bunker is het krap, koel en soms wat vochtig. Dat hoort bij de ervaring, maar het betekent ook dat grote groepen in delen naar binnen gaan. Als het bezoek onderdeel is van een dagprogramma, plannen wij die wisselmomenten in zodat er geen wachttijd ontstaat.",
    ],
    practical: [
      { label: "Duur", value: "Circa 1,5 uur" },
      { label: "Locatie", value: "Steunpunt Wn 12H, in de duinen bij Oost-Vlieland" },
      { label: "Open sinds", value: "Voorjaar 2020, na restauratie door vrijwilligers" },
      { label: "Binnen", value: "Krappe, koele ruimtes; groepen in delen naar binnen" },
      { label: "Weer", value: "Grotendeels binnen — ook een goede optie bij regen" },
    ],
    goodToKnow: [
      "Trek een extra laag aan: in de bunker is het ook in de zomer koel.",
      "Niet geschikt voor bezoekers met sterke claustrofobie.",
      "Goed te combineren met een fietstocht door de duinen naar het steunpunt toe.",
    ],
    faq: [
      {
        question: "Wat kun je zien in het bunkermuseum op Vlieland?",
        answer:
          "Een gerestaureerde Duitse bunker uit de Tweede Wereldoorlog, ingericht met originele apparatuur, uniformen en op het eiland gevonden objecten, met uitleg over de Atlantikwall en het leven op Vlieland tijdens de bezetting.",
      },
      {
        question: "Hoe lang duurt een bezoek?",
        answer:
          "Reken op ongeveer anderhalf uur inclusief de rondleiding. Bij grotere groepen gaan bezoekers in delen naar binnen.",
      },
      {
        question: "Is het bunkermuseum een goede optie bij slecht weer?",
        answer:
          "Ja. Het grootste deel van het bezoek speelt zich binnen af, waardoor het een van de betrouwbaarste programmaonderdelen is als het hard regent of waait.",
      },
    ],
  },

  strandspektakel: {
    summary:
      "Het Strandspektakel bij Vlieland Outdoor Centrum combineert in één dagdeel meerdere strandactiviteiten — zoals blokarten, powerkiten, branding raften en beach golf — waarbij groepen in rondes langs de onderdelen rouleren.",
    paragraphs: [
      "In plaats van één activiteit te kiezen, doet uw groep bij het Strandspektakel meerdere onderdelen achter elkaar. De begeleiders zetten op het strand een aantal posten uit en de deelnemers rouleren in subgroepen langs die posten. Zo probeert iedereen alles, en hoeft niemand een half uur te wachten tot hij aan de beurt is.",
      "De samenstelling van de onderdelen hangt af van wind, getij en groepsgrootte. Bij stevige wind komen blokarten en powerkiten naar voren; bij weinig wind verschuift het accent naar branding raften, beach golf, boogschieten of lasergamen in de duinen. Die flexibiliteit is precies de reden dat dit format zo betrouwbaar is: het gaat vrijwel altijd door, alleen de invulling varieert.",
      "Voor bedrijfsuitjes werkt het roulatiesysteem ook sociaal goed. Door de subgroepen door elkaar te zetten, praten collega's die elkaar normaal weinig spreken automatisch bij. Wij verdelen de groepen vooraf in overleg met u, en plannen aansluitend een borrel of beach grill op hetzelfde strand.",
    ],
    practical: [
      { label: "Vorm", value: "Meerdere strandactiviteiten in roulatie" },
      { label: "Duur", value: "Een dagdeel, afhankelijk van het aantal posten" },
      { label: "Locatie", value: "Noordzeestrand, Vlieland Outdoor Centrum" },
      { label: "Groepsgrootte", value: "Bij uitstek geschikt voor grotere gezelschappen" },
      { label: "Weer", value: "Programma wordt aangepast aan wind en getij" },
    ],
    goodToKnow: [
      "Wij verdelen de subgroepen vooraf in overleg met u — dat scheelt tijd op het strand.",
      "Combineer met een beach grill of borrel op dezelfde locatie aansluitend.",
      "Kleding die tegen zand en water kan is verstandig; neem een extra set mee.",
    ],
    faq: [
      {
        question: "Welke activiteiten zitten er in het Strandspektakel?",
        answer:
          "Een combinatie van strandactiviteiten zoals blokarten, powerkiten, branding raften, beach golf en boogschieten. De exacte samenstelling hangt af van wind, getij en de grootte van de groep.",
      },
      {
        question: "Hoe groot mag de groep zijn?",
        answer:
          "Het roulatiesysteem is juist bedoeld voor grotere gezelschappen: de groep wordt in subgroepen verdeeld die langs de posten wisselen. Wij stemmen de indeling vooraf met u af.",
      },
      {
        question: "Gaat het Strandspektakel door bij minder goed weer?",
        answer:
          "Vrijwel altijd. Bij weinig wind of ruwe zee verschuiven de begeleiders naar onderdelen die daar niet van afhankelijk zijn, zoals beach golf, boogschieten of lasergamen in de duinen.",
      },
    ],
  },
};

export const getActivityContent = (slug?: string | null): ActivityContent | null =>
  (slug && activityContent[slug]) || null;
