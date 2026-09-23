import { BedDouble, Bus, CalendarCheck, PartyPopper, Ship, Users, Utensils } from "lucide-react";
import heroImage from "@/assets/beach-event.jpg";
import cyclingTeamImage from "@/assets/cycling-team.jpg";
import arrivalImage from "@/assets/vandermost-254.jpg";
import bbqImage from "@/assets/strand-bbq.jpg";
import bonfireImage from "@/assets/beach-bonfire.jpg";
import { ISLAND_FACTS, LOGIES_LINK } from "./shared";
import type { LandingContent } from "./types";

/**
 * Personeelsuitje Vlieland (zoekwoord "personeelsuitje vlieland": in de
 * nulmeting van Search Console van 22 september 2026 op positie 8 zonder
 * eigen pagina). De hele organisatie mee, keuzeprogramma, samen eten en een
 * avond; de kleinere zakelijke varianten staan op de bedrijfsuitjepagina.
 */
const description =
  "Een personeelsuitje op Vlieland voor de hele organisatie, van 20 tot 150 collega's: overtocht, activiteiten naar keuze, eten op het strand en een avond in het dorp, geregeld vanaf het eiland.";

export const personeelsuitjeVlieland: LandingContent = {
  slug: "personeelsuitje-vlieland",
  path: "/personeelsuitje-vlieland",
  breadcrumb: "Personeelsuitje Vlieland",
  parent: { label: "Bedrijfsuitje Vlieland", to: "/bedrijfsuitje-vlieland" },
  seo: { title: "Personeelsuitje op Vlieland | Hele organisatie, tot 150 collega's", description },
  service: { name: "Personeelsuitje op Vlieland", description },
  hero: {
    image: heroImage,
    alt: "Grote groep collega's met een drankje bij een strandhuisje op Vlieland",
    eyebrow: "Personeelsuitje",
    title: "Personeelsuitje op Vlieland",
    intro:
      "Eén dag of een weekend met alle collega's op een eiland zonder auto's: activiteiten naar keuze, samen eten op het strand en 's avonds het dorp in. Wij regelen het vanaf Vlieland.",
  },
  intro: {
    title: "De hele organisatie mee, zonder gedoe",
    paragraphs: [
      "Een personeelsuitje moet voor iedereen leuk zijn: voor de collega die het liefst het wad op gaat, voor wie liever fietst of op het strand blijft, en voor de organisator die niet de hele dag met een lijst wil rondlopen. Op Vlieland lukt dat, omdat alles dichtbij ligt en er niets hoeft te worden gereden.",
      "Bureau Vlieland werkt vanaf het eiland. Wij plannen de overtocht vanuit Harlingen, verdelen de groep over activiteiten naar keuze, regelen lunch, borrel en diner en zijn er op de dag zelf bij. U krijgt één aanspreekpunt en één factuur. Wilt u blijven slapen? Dan wordt het een [meerdaags programma met overnachting](/meerdaags-bedrijfsuitje-vlieland).",
    ],
  },
  facts: ISLAND_FACTS,
  sections: [
    {
      kind: "features",
      title: "Zo ziet een personeelsuitje op Vlieland eruit",
      columns: 3,
      items: [
        { icon: Ship, title: "Overtocht vanuit Harlingen", text: "Samen op de boot, 90 minuten varen. Wij stemmen de afvaart af op uw programma." },
        { icon: Users, title: "Activiteiten naar keuze", text: "Collega's kiezen zelf: zeehondentocht, wadexcursie, blokarten, een fietstocht of gewoon het strand." },
        { icon: Utensils, title: "Samen eten", text: "Lunch onderweg, borrel op het strand en een diner of barbecue op één plek voor de hele groep." },
        { icon: Bus, title: "Vervoer op het eiland", text: "Fietsen, te voet of met groepsvervoer; niemand hoeft te rijden." },
        { icon: PartyPopper, title: "Avondprogramma", text: "Een feestavond in het dorp of een vuur op het strand als afsluiting." },
        { icon: CalendarCheck, title: "Eén planning", text: "Wij bewaken de tijden van boot, activiteiten en catering, ook op de dag zelf." },
      ],
      closing: "Van 20 tot 150 collega's. Grotere groepen? Overleg met ons.",
    },
    {
      kind: "split",
      title: "Iedereen doet mee, ieder op zijn eigen manier",
      paragraphs: [
        "Bij een grote groep verschillen de wensen. Daarom bouwen wij een personeelsuitje meestal als keuzeprogramma: de groep splitst zich op in kleinere gezelschappen die elk hun eigen activiteit doen, en komt samen bij lunch, borrel en diner. Zo hoeft niemand mee met iets wat niet past, en toch beleeft iedereen dezelfde dag.",
      ],
      checklist: [
        "Keuzeprogramma met twee tot vier activiteiten naast elkaar",
        "Rustige opties voor wie liever wandelt of op het terras zit",
        "Gezamenlijke momenten bij lunch, borrel en diner",
        "Begeleiding op het eiland, zodat de organisator zelf ook meedoet",
      ],
      image: { src: cyclingTeamImage, alt: "Collega's poseren lachend met hun fietsen onder de bomen op Vlieland" },
    },
    {
      kind: "gallery",
      title: "Van aankomst tot afsluiting",
      intro: "Een greep uit wat groepen vaak kiezen.",
      images: [
        {
          src: arrivalImage,
          alt: "Groep krijgt uitleg bij de fietsen na aankomst op Vlieland",
          title: "Aankomst en fietsen",
          text: "De fietsen staan klaar bij de boot; de eerste uitleg krijgt u van iemand die het eiland kent.",
        },
        {
          src: bbqImage,
          alt: "Barbecue op het strand van Vlieland voor een groep",
          title: "Eten op het strand",
          text: "Barbecue of buffet op het strand, voor kleine en grote groepen.",
        },
        {
          src: bonfireImage,
          alt: "Groep rond een vuur op het strand van Vlieland in de avond",
          title: "Avond op het strand",
          text: "Afsluiten rond een vuur op het strand of met een feestavond in het dorp.",
        },
      ],
      aside: {
        icon: BedDouble,
        title: "Blijven slapen?",
        text: "Met een overnachting wordt een personeelsuitje een weekend: meer tijd voor elkaar en geen boot terug diezelfde avond.",
        link: { label: "Bekijk meerdaagse opties", to: "/meerdaags-bedrijfsuitje-vlieland" },
      },
    },
    {
      kind: "prose",
      title: "Waarom via Bureau Vlieland?",
      paragraphs: [
        "Wij zitten op het eiland en werken al jaren met dezelfde schippers, gidsen, koks en hoteliers. Daardoor weten wij wat op een dag past, hoeveel tijd de overtocht en het fietsen echt kosten en waar een groep van honderd mensen tegelijk kan eten. U hoeft niet met tien aanbieders te bellen: u legt uw wensen bij ons neer en krijgt binnen vijf werkdagen een voorstel.",
      ],
      closing: "Geen standaardpakket, wel een programma dat op uw groep is gebouwd.",
    },
  ],
  templates: {
    title: "Voorbeelden van personeelsuitjes",
    intro: "Dagprogramma's van eerdere groepen, om van te starten of ideeën op te doen.",
    durationDays: 1,
  },
  quote: {
    text: "Vanaf de allereerste bespreking om invulling te geven aan een culinair, sportief en avontuurlijk weekend op Vlieland, tot en met het afscheid bij de terminal 2 dagen later in Harlingen, heeft het team van Bureau Vlieland dit weekend tot in detail onvergetelijk gemaakt voor een ieder!",
    author: "Peter-Paul van de Kar",
    company: "Tradekar International BV",
  },
  faq: [
    {
      question: "Wat kost een personeelsuitje op Vlieland?",
      answer:
        "Reken voor een dagprogramma vanaf ongeveer € 95 per persoon, exclusief de overtocht. Met overnachting, diner en avondprogramma ligt het bedrag hoger. U ontvangt een offerte op maat waarin alle onderdelen apart staan.",
    },
    {
      question: "Hoe groot kan de groep zijn?",
      answer:
        "Van 20 tot 150 collega's is gebruikelijk. Vanaf ongeveer 50 personen verdelen wij de groep over meerdere activiteiten en afvaarten; bij meer dan 150 overleggen wij eerst over boot, logies en eetlocaties.",
    },
    {
      question: "Hoe werkt de overtocht met een grote groep?",
      answer:
        "De veerboot vanuit Harlingen vaart 90 minuten. Wij stemmen de afvaart af op uw programma en zorgen dat fietsen of groepsvervoer bij aankomst klaarstaan. Auto's blijven op het vasteland.",
    },
    {
      question: "Kunnen collega's kiezen uit verschillende activiteiten?",
      answer:
        "Ja. Een keuzeprogramma is bij personeelsuitjes de regel: twee tot vier activiteiten naast elkaar, van zeehondentocht en wadexcursie tot blokarten, een fietstocht of een strandwandeling. Iedereen komt samen bij lunch, borrel en diner.",
    },
    {
      question: "Kunnen wij blijven slapen?",
      answer:
        "Ja. Voor groepen zoeken wij logies in hotels, groepsaccommodaties of vakantiehuizen, ook voor grote gezelschappen verdeeld over meerdere adressen. Bekijk de mogelijkheden bij [logies op Vlieland](/logies-vlieland).",
    },
    {
      question: "Is een feestavond mogelijk?",
      answer:
        "Ja. Een feestavond in het dorp, een vuur op het strand of een diner met muziek sluiten de dag af. Wij regelen locatie, catering en de terugweg naar het logies.",
    },
    {
      question: "Wanneer moeten wij boeken?",
      answer:
        "Hoe eerder u reserveert, hoe meer keuze in logies en eetlocaties. Een dagprogramma zonder overnachting is vaak ook op kortere termijn te regelen.",
    },
  ],
  also: [
    { label: "Bedrijfsuitje Vlieland", to: "/bedrijfsuitje-vlieland" },
    { label: "Teambuilding Vlieland", to: "/teamuitje-vlieland" },
    { label: "Meerdaags bedrijfsuitje Vlieland", to: "/meerdaags-bedrijfsuitje-vlieland" },
    { label: "Catering op Vlieland", to: "/catering" },
    LOGIES_LINK,
  ],
};
