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
      "Een begeleide wadloopexcursie op Vlieland gaat onder leiding van een ervaren gids het drooggevallen wad rond het eiland op en start op een tijdstip dat door het getij wordt bepaald. De prijs is €17,50 per volwassene en €12,50 per kind.",
    paragraphs: [
      "Wadlopen is de enige manier om het werelderfgoed Waddenzee letterlijk onder je voeten te voelen. Bij laagwater valt een landschap droog dat er twee keer per dag anders uitziet: geulen, slikvlaktes, mosselbanken en priel na priel. Een gids laat zien wat er leeft — wadpieren, kokkels, garnalen, krabben — en legt uit waarom dit gebied zo bijzonder is dat het op de UNESCO-lijst staat.",
      "Zonder gids is het wad levensgevaarlijk: het tij komt sneller op dan mensen inschatten en mist kan binnen minuten het zicht wegnemen. Daarom werken wij uitsluitend met gecertificeerde wadgidsen die het gebied rond Vlieland dagelijks kennen. Zij bepalen route en starttijd op basis van de getijdentabel en de actuele weersverwachting.",
      "Voor groepen is wadlopen een verrassend sterke teamactiviteit. Je loopt in een tempo waarin iedereen mee kan, je helpt elkaar door de geulen en je praat onderweg anders dan in een vergaderzaal. Veel bedrijven combineren de excursie daarom met een lunch of borrel erna — modder eerst, verhalen daarna.",
    ],
    practical: [
      { label: "Duur", value: "In overleg met de gids; het getij bepaalt route en tijdsduur" },
      { label: "Prijs", value: "€17,50 per volwassene, €12,50 per kind (4 t/m 12 jaar)" },
      { label: "Inbegrepen", value: "Begeleiding door een gecertificeerde wadgids" },
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
        question: "Wat kost een wadloopexcursie op Vlieland?",
        answer:
          "€17,50 per volwassene en €12,50 per kind van 4 t/m 12 jaar, inclusief begeleiding door een gecertificeerde wadgids. Doorlopen naar het vasteland is vanaf Vlieland niet mogelijk; het gaat om excursies op en rond de platen.",
      },
      {
        question: "Hoe zwaar is een wadloopexcursie?",
        answer:
          "Lopen door slik kost meer energie dan lopen over een pad. Een redelijke basisconditie volstaat; de gids houdt het tempo van de langzaamste deelnemer aan.",
      },
      {
        question: "Waarom staan starttijd en duur niet vast?",
        answer:
          "Het wad valt alleen rond laagwater droog en dat schuift elke dag op. De gids bepaalt starttijd, route en daarmee de duur aan de hand van de getijdentabel; wij bouwen het programma daaromheen en leggen de tijden vooraf met u vast.",
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
      "Omdat het gebied leeg en weids is, werkt de rit uitstekend als opening van een groepsdag: iedereen zit samen in één truck, er is niets dat afleidt, en aan het eindpunt kun je uitstappen voor een strandwandeling. De rit vertrekt vanaf Badweg 6 en wordt geboekt voor gezelschappen van 15 tot 50 personen.",
    ],
    practical: [
      { label: "Duur", value: "Circa 2 uur" },
      { label: "Vertrekpunt", value: "Badweg 6, Vlieland" },
      { label: "Prijs", value: "€30,00 per persoon" },
      { label: "Groepsgrootte", value: "15 tot 50 personen" },
      { label: "Seizoen", value: "Het hele jaar door, weersafhankelijk" },
      { label: "Toegankelijkheid", value: "Instappen vergt een opstapje; meld beperkingen vooraf" },
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
          "Ja. De rit wordt geboekt vanaf 15 personen, met maximaal 50 deelnemers per truck, voor €30,00 per persoon. Grotere gezelschappen verdelen wij over meerdere ritten.",
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
      "De activiteit is uitstekend te combineren met blokarten op hetzelfde stuk strand ter hoogte van bushalte Ankerplaats; het materiaal en de begeleiding staan dan al klaar. Houd er rekening mee dat er op die locatie geen toiletvoorzieningen zijn. Wij plannen het als één blok in het dagprogramma, inclusief het fietsen naar het strand en terug.",
    ],
    practical: [
      { label: "Duur", value: "Circa 1,5 uur inclusief instructie" },
      { label: "Locatie", value: "Strand t.h.v. bushalte Ankerplaats, Oost-Vlieland" },
      { label: "Prijs", value: "€35,00 per persoon" },
      { label: "Groepsgrootte", value: "10 tot 40 personen" },
      { label: "Voorkennis", value: "Niet nodig — beginners zijn welkom" },
      { label: "Voorzieningen", value: "Op de locatie zijn geen toiletvoorzieningen aanwezig" },
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
        question: "Wat kost powerkiten en voor welke groepen is het geschikt?",
        answer:
          "Powerkiten kost €35,00 per persoon en wordt geboekt voor groepen van 10 tot 40 personen. De instructeur past de maat van de kite aan op gewicht en ervaring van de deelnemer.",
      },
    ],
  },

  surfles: {
    summary:
      "Surfles op Vlieland duurt ongeveer 2,5 uur, kost €55,00 per persoon en wordt op het strand ter hoogte van bushalte Ankerplaats gegeven aan groepen van 6 tot 20 personen, voor zowel beginners als gevorderden.",
    paragraphs: [
      "Het Noordzeestrand van Vlieland loopt flauw af, waardoor de golven relatief ver uit de kust al breken. Dat is ideaal voor beginners: je staat lang op stahoogte en hoeft niet ver te peddelen om een golf te pakken. De les begint op het droge met de pop-up, de veiligheidsregels en de stroming, en gaat daarna het water in.",
      "Een groep wordt opgesplitst naar niveau, zodat wie al eens gesurft heeft niet hoeft te wachten op de eerste pop-up van de rest. De les wordt geboekt voor 6 tot 20 personen; welk materiaal de aanbieder meelevert, bevestigen wij vooraf bij de reservering.",
      "Voor bedrijfsgroepen is surfles een activiteit waarbij hiërarchie snel verdwijnt: iedereen valt evenveel om. Plan er wel voldoende tijd omheen in: omkleden, douchen en warm worden kost samen al gauw een half uur extra. Wij houden daar in het programma rekening mee.",
    ],
    practical: [
      { label: "Duur", value: "Circa 2,5 uur inclusief instructie" },
      { label: "Locatie", value: "Strand t.h.v. bushalte Ankerplaats, Oost-Vlieland" },
      { label: "Prijs", value: "€55,00 per persoon" },
      { label: "Groepsgrootte", value: "6 tot 20 personen" },
      { label: "Niveau", value: "Beginners en gevorderden, in aparte groepjes" },
      { label: "Voorzieningen", value: "Op de locatie zijn geen toiletvoorzieningen aanwezig" },
    ],
    goodToKnow: [
      "Neem een handdoek, badkleding en droge kleding mee; op de locatie zijn geen toiletvoorzieningen.",
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
        question: "Wat kost surfles en hoe groot mag de groep zijn?",
        answer:
          "Surfles kost €55,00 per persoon en wordt gegeven aan groepen van 6 tot 20 personen. Neem zelf badkleding, een handdoek en droge kleding mee; welk materiaal is inbegrepen bevestigen wij bij de reservering.",
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
      "Blokarten op Vlieland is strandzeilen in een driewielige kar met zeil; een sessie duurt ongeveer 1 uur, kost €32,50 per persoon en wordt geboekt voor groepen van 8 tot 16 personen.",
    paragraphs: [
      "Een blokart is een lage driewieler met een zeil, waarmee je over het harde, natte zand langs de vloedlijn racet. Sturen doe je met je voeten, snelheid regel je met het touw waarmee je het zeil aantrekt of laat vieren. Dat klinkt technisch, maar in de praktijk rijdt vrijwel iedereen na een korte instructie zelfstandig een baan.",
      "Doordat je vlak boven het zand zit, voelt de snelheid als het dubbele. Er zit een natuurlijke competitie in: groepen gaan onherroepelijk tijden vergelijken. Voor teamdagen is dat een sterke motor — het is fysiek licht maar mentaal fanatiek.",
      "Blokarten kan alleen bij laag water en met pal aanlandige wind. Er is minimaal windkracht 3 (8 tot 10 knopen) nodig; windkracht 4 tot 6 geeft de beste omstandigheden. Bij te weinig of juist te veel wind kan de activiteit worden verschoven. De instructeur beslist dat op de dag zelf; wij zorgen dan voor een passend alternatief in hetzelfde tijdvak.",
    ],
    practical: [
      { label: "Duur", value: "Circa 1 uur" },
      { label: "Locatie", value: "Strand t.h.v. bushalte Ankerplaats, Oost-Vlieland" },
      { label: "Prijs", value: "€32,50 per persoon" },
      { label: "Groepsgrootte", value: "8 tot 16 personen" },
      { label: "Voorwaarden", value: "Laag water en pal aanlandige wind, minimaal windkracht 3" },
      { label: "Voorzieningen", value: "Op de locatie zijn geen toiletvoorzieningen aanwezig" },
    ],
    goodToKnow: [
      "Draag een zonnebril of sportbril: opspattend zand is het enige echte ongemak.",
      "Instructie door een begeleider hoort bij de activiteit.",
      "Ook geschikt voor deelnemers die niet sportief zijn — je zit, je rent niet.",
    ],
    faq: [
      {
        question: "Wat is blokarten precies?",
        answer:
          "Blokarten is strandzeilen in een lage driewielige kar met een zeil. U stuurt met de voeten en regelt de snelheid met het zeiltouw. Een sessie duurt ongeveer 1 uur inclusief instructie en kost €32,50 per persoon.",
      },
      {
        question: "Wanneer kan er geblokart worden?",
        answer:
          "Alleen bij laag water en pal aanlandige wind. Er is minimaal windkracht 3 nodig; windkracht 4 tot 6 geeft de beste omstandigheden. De instructeur beoordeelt dat op de dag zelf.",
      },
      {
        question: "Is blokarten gevaarlijk?",
        answer:
          "Nee, mits u de instructie van de begeleider volgt. Het zwaartepunt van de kar ligt zeer laag en de activiteit gaat alleen door bij geschikte wind- en waterstand. Blokarten wordt geboekt voor 8 tot 16 personen.",
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
      { label: "Locatie", value: "Liesbeth Listpad, Oost-Vlieland" },
      { label: "Prijs", value: "Op aanvraag; richtprijs €8,00 per persoon" },
      { label: "Groepsgrootte", value: "10 tot 25 personen" },
      { label: "Toegankelijkheid", value: "Alleen via trap, geen lift" },
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
          "Het bezoek wordt geboekt voor 10 tot 25 personen en boven is de ruimte beperkt, dus gezelschappen gaan in kleinere groepjes naar boven. De prijs is op aanvraag, met een richtprijs van €8,00 per persoon. Wij verwerken de tijdsblokken in uw programma.",
      },
    ],
  },

  "fietstocht-met-begeleiding": {
    summary:
      "Een begeleide fietstocht over Vlieland duurt ongeveer twee uur, volgt de verharde fietspaden door duin, bos en dorp, en wordt geleid door een eilandgids die onderweg het verhaal van het eiland vertelt.",
    paragraphs: [
      "Vlieland is autoluw en telt tientallen kilometers fietspad, dus de fiets is hier geen alternatief maar het normale vervoermiddel. Tijdens een begeleide tocht rijd je in rustig tempo van het dorp naar het bos, langs de duinen en naar uitzichtpunten die je met een kaartje in de hand zelden vindt.",
      "Wat de tocht onderscheidt van zelf rondfietsen is het verhaal. De gids vertelt over het verdwenen dorp West-Vlieland dat door de zee is opgeslokt, over de bosaanplant die het stuifzand moest vastleggen, en over hoe een eiland met ruim duizend inwoners in de zomer tienduizenden gasten opvangt. Daar hoort ook de minder romantische kant bij: drinkwater, afvalverwerking en woningnood op een eiland.",
      "De route wordt afgestemd op de groep en start bij de Waddendijk ter hoogte van Willem de Vlamingh. Met een gezelschap dat stevig doortrapt gaan we verder het eiland op; met een gemengde groep blijven we dichter bij het dorp en lassen we meer stops in. E-bikes zijn los bij te boeken, wat het verschil in tempo binnen een groep grotendeels wegneemt.",
    ],
    practical: [
      { label: "Duur", value: "Circa 2 uur" },
      { label: "Startpunt", value: "Waddendijk, bij Willem de Vlamingh, Oost-Vlieland" },
      { label: "Prijs", value: "€19,00 per persoon" },
      { label: "Groepsgrootte", value: "10 tot 30 personen" },
      { label: "Fietsen", value: "Huurfietsen en e-bikes los bij te boeken" },
      { label: "Ondergrond", value: "Verharde fietspaden" },
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
          "Circa 2 uur. De tocht start bij de Waddendijk ter hoogte van Willem de Vlamingh en de route wordt aangepast op het tempo van de groep.",
      },
      {
        question: "Zijn er fietsen inbegrepen?",
        answer:
          "De begeleiding en de route zijn inbegrepen; huurfietsen en e-bikes boekt u er los bij. Wij reserveren ze vooraf en zetten ze op het juiste moment in het programma.",
      },
      {
        question: "Kan de fietstocht met een grote groep?",
        answer:
          "De tocht wordt geboekt voor 10 tot 30 personen, voor €19,00 per persoon. Bij grotere gezelschappen zetten we meerdere gidsen en meerdere vertrekmomenten in, zodat de groep niet uitwaaiert over het fietspad.",
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
      { label: "Locatie", value: "Kantonnierspad 1, Oost-Vlieland" },
      { label: "Prijs", value: "€8,00 per volwassene, €5,50 per kind (4 t/m 12 jaar)" },
      { label: "Open sinds", value: "Voorjaar 2020, na restauratie door vrijwilligers" },
      { label: "Te zien", value: "Tentoonstelling, korte film, loopgraven, elf bunkers en buitenmuseum" },
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
          "Reken op circa 1,5 uur inclusief de rondleiding door de tentoonstelling, de loopgraven en de bunkers. Een bezoek kost €8,00 per volwassene en €5,50 per kind van 4 t/m 12 jaar.",
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
      "Het Strandspektakel bij Vlieland Outdoor Center combineert in één dagdeel meer dan veertig strandactiviteiten waaruit uw groep zelf kiest, voor €32,50 per persoon, op het strand ter hoogte van bushalte Ankerplaats.",
    paragraphs: [
      "In plaats van één activiteit te kiezen, doet uw groep bij het Strandspektakel meerdere onderdelen achter elkaar. De begeleiders zetten op het strand een aantal posten uit en de deelnemers rouleren in subgroepen langs die posten. Zo probeert iedereen alles, en hoeft niemand een half uur te wachten tot hij aan de beurt is.",
      "De samenstelling van de onderdelen bepaalt u zelf, in overleg met de instructeurs. Bij stevige wind komen de windafhankelijke onderdelen naar voren; bij weinig wind verschuift het accent naar onderdelen die daar niet van afhankelijk zijn. Die flexibiliteit is precies de reden dat dit format zo betrouwbaar is: het gaat vrijwel altijd door, alleen de invulling varieert.",
      "Voor bedrijfsuitjes werkt het roulatiesysteem ook sociaal goed. Door de subgroepen door elkaar te zetten, praten collega's die elkaar normaal weinig spreken automatisch bij. Wij verdelen de groepen vooraf in overleg met u, en plannen aansluitend een borrel of beach grill op hetzelfde strand.",
    ],
    practical: [
      { label: "Vorm", value: "Meer dan veertig strandactiviteiten onder begeleiding, zelf samen te stellen" },
      { label: "Duur", value: "Een dagdeel, in overleg met de instructeurs" },
      { label: "Locatie", value: "Strand t.h.v. bushalte Ankerplaats, Oost-Vlieland" },
      { label: "Prijs", value: "€32,50 per persoon" },
      { label: "Voorzieningen", value: "Op de locatie zijn geen toiletvoorzieningen aanwezig" },
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
          "Er staan meer dan veertig activiteiten klaar, van sportief tot denkpuzzels en van creatief tot spektakel op zee. U bepaalt zelf welke onderdelen u doet; de invulling kan ook ter plekke met de instructeurs worden afgestemd. Deelname kost €32,50 per persoon.",
      },
      {
        question: "Hoe groot mag de groep zijn?",
        answer:
          "Het roulatiesysteem is juist bedoeld voor grotere gezelschappen: de groep wordt in subgroepen verdeeld die langs de posten wisselen. Wij stemmen de indeling vooraf met u af; voor deze activiteit geldt geen vaste minimum- of maximumgroep.",
      },
      {
        question: "Gaat het Strandspektakel door bij minder goed weer?",
        answer:
          "Vrijwel altijd. Er zijn meer dan veertig onderdelen beschikbaar, dus bij weinig wind of ruwe zee stemmen de instructeurs de invulling af op onderdelen die daar niet van afhankelijk zijn.",
      },
    ],
  },
};

export const getActivityContent = (slug?: string | null): ActivityContent | null =>
  (slug && activityContent[slug]) || null;
