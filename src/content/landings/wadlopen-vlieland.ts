import { CalendarDays, Clock, Euro, Footprints, MapPin, ShieldCheck, Users } from "lucide-react";
import heroImage from "@/assets/wadexcursie-vlieland-wad-schelpen.webp";
import gidsImage from "@/assets/wadexcursie-vlieland-gids-wadworm.webp";
import gezinImage from "@/assets/wadexcursie-vlieland-gezin-wadlopen.webp";
import type { ActivityLandingContent } from "./types";

/**
 * Wadexcursie Vlieland (zoekwoord "wadlopen vlieland"). Kernframing: u kunt
 * NIET vanaf het vasteland naar Vlieland wadlopen (de geulen zijn ook bij eb
 * te diep). Het product is een wadexcursie óp en rond Vlieland met een
 * lokale gids; nergens "loop naar Vlieland" suggereren. De feiten (duur,
 * prijs, groepsgrootte) worden bewaakt tegen `src/content/activityContent.ts`.
 */
export const wadlopenVlieland: ActivityLandingContent = {
  kind: "activity",
  slug: "wadlopen-vlieland",
  path: "/wadlopen-vlieland",
  breadcrumb: "Wadexcursie Vlieland",
  seo: {
    title: "Wadexcursie Vlieland boeken | Wadlopen met gids, alle leeftijden",
    description:
      "Het wad op met een ervaren gids op Vlieland: leerzaam, voor alle leeftijden. Ontdek zeehonden, vogels en het leven op het wad. Boek uw wadexcursie direct online.",
  },
  trip: {
    name: "Wadexcursie Vlieland",
    description: "Begeleide wadexcursie op Vlieland: met een ervaren gids het wad op. Leerzaam en geschikt voor alle leeftijden.",
    touristType: "Gezinnen, natuurliefhebbers, alle leeftijden",
    lowPrice: "17.50",
    highPrice: "20.00",
  },
  hero: {
    image: heroImage,
    alt: "Wadexcursie op Vlieland: groep loopt met gids over het wad",
    eyebrow: "Wadexcursie",
    title: "Wadexcursie Vlieland: het wad op met een gids",
    intro: "Met een lokale gids het wad op: leerzaam, avontuurlijk en geschikt voor het hele gezin.",
  },
  summary:
    "Een wadexcursie op Vlieland is een begeleide wandeling over het drooggevallen wad rond het eiland, altijd rond laag water. De gids bepaalt starttijd, route en duur aan de hand van het getij. De excursie kost €17,50 per volwassene en €12,50 per kind (4 t/m 12 jaar). Wadlopen vanaf het vasteland naar Vlieland is niet mogelijk: de geulen zijn ook bij eb te diep.",
  facts: [
    { icon: Clock, label: "Duur", value: "Bepaald door het getij" },
    { icon: Euro, label: "Prijs", value: "€17,50 p.p., kind €12,50" },
    { icon: CalendarDays, label: "Wanneer", value: "Rond laag water, hele jaar" },
    { icon: Footprints, label: "Inbegrepen", value: "Laarzen en lokale gids" },
  ],
  intro: {
    title: "Te voet door het Werelderfgoed",
    paragraphs: [
      "Trek uw laarzen aan en ontdek het Werelderfgoed Waddenzee van de mooiste kant: te voet. Tijdens een wadexcursie op Vlieland neemt een lokale gids, die het eiland en het wad op zijn duimpje kent, u mee het wad op, vertelt over het leven onder uw voeten en wijst u zeehonden, vogels en bijzondere wadbewoners aan. Een avontuur midden in de natuur, geschikt voor alle leeftijden en dus ook leuk met (klein)kinderen.",
      "Als Werelderfgoed-ambassadeur weten wij precies wat dit gebied zo bijzonder maakt, en dat merkt u tijdens elke excursie.",
    ],
    trust: [
      { icon: ShieldCheck, title: "Lokale, ervaren gidsen" },
      { icon: Users, title: "Geschikt voor alle leeftijden" },
    ],
  },
  sections: [
    {
      kind: "prose",
      spacing: "compact",
      title: "Wat is een wadexcursie?",
      paragraphs: [
        "Bij laag water valt de zeebodem droog en kunt u over het wad lopen. Onder begeleiding van een gids ontdekt u dit unieke landschap van zandbanken, slik en geulen. De gids kent het gebied, de getijden en de gevaren, en leert u onderweg van alles over de Waddenzee.",
      ],
    },
    {
      kind: "prose",
      spacing: "compact",
      title: "Kunt u naar Vlieland wadlopen?",
      paragraphs: [
        "Nee. Anders dan bij Ameland of Schiermonnikoog is er geen wadlooproute vanaf het vasteland naar Vlieland: de geulen tussen de Friese kust en het eiland blijven ook bij eb te diep en de stroming is te sterk. U komt op Vlieland met de veerboot van Rederij Doeksen vanuit Harlingen. Wat wél kan, en wat de meeste mensen zoeken, is een wadexcursie óp Vlieland: met een gids het drooggevallen wad rond het eiland op.",
      ],
    },
    {
      kind: "split",
      title: "Voor wie is het geschikt?",
      paragraphs: [
        "De wadexcursie is geschikt voor alle leeftijden. Het is geen zware tocht maar een leerzame wandeling, dus ook ideaal voor gezinnen met kinderen. Een goede gezondheid en een beetje doorzettingsvermogen (het kan modderig zijn) zijn wel handig.",
      ],
      image: { src: gezinImage, alt: "Gezin met kinderen loopt over het wad tijdens een wadexcursie op Vlieland" },
    },
    {
      kind: "split",
      title: "Wat gaat u zien en leren?",
      paragraphs: [
        "U leert hoe eb en vloed het wad vormen, welke dieren en planten hier leven en hoe u sporen leest in het slik. Met een beetje geluk spot u zeehonden op een zandplaat of ziet u wadvogels foerageren.",
      ],
      image: { src: gidsImage, alt: "Gids toont een wadworm op zijn hand tijdens de wadexcursie" },
    },
    {
      kind: "prose",
      title: "Met uw groep, met onze gidsen",
      paragraphs: [
        "Voor bedrijfsuitjes, teamdagen en familieweekenden reserveren wij een eigen gids, zodat uw groep niet aansluit bij losse bezoekers. Omdat de starttijd het getij volgt, bouwen wij de rest van de dag daaromheen: overtocht, fietsen, lunch en bijvoorbeeld een zeehondentocht. Bekijk de [voorbeeldprogramma's](/voorbeeldprogrammas) waarin de wadexcursie al is ingepland.",
        "Wij werken samen met lokale gidsen die het eiland en het wad door en door kennen, en wij zijn Werelderfgoed-ambassadeur. U gaat dus op pad met mensen die het gebied echt kennen: veilig, en met verhalen die u nergens anders hoort.",
      ],
      closing: "Eén aanvraag, één aanspreekpunt, één factuur.",
    },
    {
      kind: "features",
      title: "Praktisch",
      columns: 3,
      items: [
        { icon: Clock, title: "Duur", text: "Bepaald door het getij; de gids kiest route en tijdsduur." },
        { icon: CalendarDays, title: "Wanneer", text: "Alleen rond laagwater: van een uur vóór tot een uur ná laag tij." },
        { icon: MapPin, title: "Vertrekpunt", text: "Varieert per excursie; u krijgt het startpunt bij uw boeking door." },
        { icon: Footprints, title: "Laarzen inbegrepen", text: "Geen waterschoenen nodig, wij zorgen voor laarzen." },
        { icon: ShieldCheck, title: "Veiligheid", text: "Altijd met een ervaren, lokale gids. Ga nooit alleen het wad op." },
      ],
      notes: [
        "Meenemen: kleding die nat en vies mag worden, reservekleding en -sokken en drinken; bij zon een pet en zonnebrand.",
        "Benieuwd wanneer het laag water is op Vlieland? Bekijk de actuele [waterstanden Vlieland](https://www.getij.nl/?locatiecode=VLIELHVN) van Rijkswaterstaat.",
      ],
    },
  ],
  booking: {
    blockId: "wadloopexcursie",
    title: "Boek uw wadexcursie op Vlieland",
    intro: "Kies uw datum en boek direct online, of voeg de excursie toe aan uw programma op Vlieland.",
    introRequest: "Vraag uw datum aan, of voeg de excursie toe aan uw programma op Vlieland.",
    price: "Volwassenen €17,50",
    priceNote: "kinderen 4 t/m 12 jaar €12,50",
    bookLabel: "Boek uw wadexcursie",
    requestLabel: "Vraag uw wadexcursie aan",
    requestPath: "/snel-aanvragen?categorie=excursies&onderwerp=wadexcursie",
    groupRequestPath: "/snel-aanvragen?categorie=excursies&onderwerp=wadexcursie-groep",
    trustBookable: "Direct online te boeken",
    trustRequest: "Eenvoudig online aan te vragen",
  },
  faqTitle: "Veelgestelde vragen over de wadexcursie op Vlieland",
  faq: [
    {
      question: "Kunt u vanaf het vasteland naar Vlieland wadlopen?",
      answer:
        "Nee. De geulen tussen de Friese kust (Harlingen) en Vlieland zijn ook bij eb te diep en de stroming is te sterk. Wadlopen náár Vlieland is dus niet mogelijk. Wat wél kan: een wadexcursie óp Vlieland, waarbij u met een gids het wad rond het eiland verkent.",
    },
    {
      question: "Is de wadexcursie geschikt voor kinderen?",
      answer: "Ja, de excursie is geschikt voor alle leeftijden en daarmee ook leuk voor gezinnen met kinderen.",
    },
    {
      question: "Wanneer kan een wadexcursie plaatsvinden?",
      answer:
        "Een wadexcursie kan alleen rond laag water: ongeveer van een uur vóór tot een uur ná laagwater. De starttijd hangt dus af van het getij van die dag. Bekijk de actuele waterstanden Vlieland op getij.nl (Rijkswaterstaat) om een idee te krijgen van het tijdvenster.",
    },
    {
      question: "Hoe lang duurt een wadexcursie?",
      answer: "De duur hangt af van het getij en de route die de gids kiest; wij leggen de exacte tijden vooraf vast in uw programma.",
    },
    {
      question: "Wat moet ik meenemen?",
      answer:
        "Laarzen zijn inbegrepen, dus die hoeft u niet mee te nemen. Neem wel kleding mee die nat en vies mag worden, reservekleding en -sokken en drinken. Bij mooi weer een pet en zonnebrand.",
    },
    {
      question: "Is wadlopen gevaarlijk?",
      answer: "Niet onder begeleiding. Ga nooit alleen het wad op; met een ervaren, erkende gids is het veilig en juist heel leerzaam.",
    },
    {
      question: "Wat kost een wadexcursie op Vlieland?",
      answer: "De prijs is €17,50 per volwassene en €12,50 per kind van 4 t/m 12 jaar. De actuele beschikbaarheid ziet u bij het boeken of aanvragen.",
    },
    {
      question: "Vanaf welke leeftijd kunnen kinderen mee met de wadexcursie?",
      answer:
        "Kinderen kunnen mee; voor kinderen van 4 tot en met 12 jaar geldt het kindertarief van €12,50. Het is een wandeling door slik en langs geulen, dus kinderen moeten een tijd zelf kunnen lopen. Twijfelt u over jonge kinderen, overleg dan even met ons.",
    },
    {
      question: "Kan ik vandaag of morgen nog mee?",
      answer:
        "Als er die dag een excursie gaat en er plek is. In de boekkalender op deze pagina ziet u per dag of er een excursie is en hoe laat; daar boekt u direct. Groepen plannen wij vooruit, zodat de gids voor uw gezelschap alleen gaat.",
    },
    {
      question: "Wat gebeurt er bij slecht weer?",
      answer:
        "Bij dichte mist of onweer gaat de excursie niet door; dat is een veiligheidsbeslissing van de gids. Regen of wind zijn op zich geen reden om af te zeggen, trek dan kleding aan die nat mag worden. Vervalt de excursie, dan zoeken wij met u een ander moment of een andere activiteit.",
    },
  ],
  reviews: { title: "Reviews over Bureau Vlieland", subtitle: "Wat klanten zeggen over onze wadexcursies en groepsprogramma's" },
  also: [
    { label: "Zeehondentochten op Vlieland", to: "/zeehondentochten-vlieland", description: "Duur, prijs en beste tijd om zeehonden te spotten" },
    { label: "Alle activiteiten op Vlieland", to: "/activiteiten-vlieland", description: "Wat kunt u doen op het eiland, per seizoen" },
    { label: "Familieweekend op Vlieland", to: "/familieweekend-vlieland" },
    { label: "Groepsweekend op Vlieland", to: "/groepsweekend-vlieland" },
    { label: "Teambuilding op Vlieland", to: "/teamuitje-vlieland" },
    { label: "Voorbeeldprogramma's", to: "/voorbeeldprogrammas", description: "Kant-en-klare dagindelingen van eerdere groepen" },
  ],
};
