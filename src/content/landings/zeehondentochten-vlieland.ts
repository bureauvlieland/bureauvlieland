import { Anchor, CalendarDays, Clock, Euro, MapPin, ShieldCheck, Users } from "lucide-react";
import heroImage from "@/assets/zeehondentocht-vlieland-zandbank.jpg";
import sealTourImage from "@/assets/seal-tour.jpg";
import type { ActivityLandingContent } from "./types";

/**
 * Zeehondentocht Vlieland (zoekwoord "zeehondentocht vlieland"): boottocht
 * vanaf Vlieland naar de zandbanken (onder andere de Richel) om grijze en
 * gewone zeehonden te spotten. Los te boeken of als onderdeel van een
 * groepsprogramma. De feiten worden bewaakt tegen `src/content/activityContent.ts`.
 */
export const zeehondentochtenVlieland: ActivityLandingContent = {
  kind: "activity",
  slug: "zeehondentochten-vlieland",
  path: "/zeehondentochten-vlieland",
  breadcrumb: "Zeehondentochten Vlieland",
  seo: {
    title: "Zeehondentocht Vlieland boeken | Zeehonden spotten op de zandbanken",
    description:
      "Een zeehondentocht vanaf Vlieland: per boot naar de zandbanken in de Waddenzee. Gewone én grijze zeehonden van dichtbij. Direct online te boeken of als groep.",
  },
  trip: {
    name: "Zeehondentocht Vlieland",
    description: "Begeleide boottocht vanaf Vlieland naar de zandbanken in de Waddenzee om gewone en grijze zeehonden te spotten.",
    touristType: "Gezinnen, natuurliefhebbers, groepen, alle leeftijden",
    lowPrice: "25.00",
    highPrice: "35.00",
  },
  hero: {
    image: heroImage,
    alt: "Zeehonden rusten op een zandbank in de Waddenzee bij Vlieland in zacht avondlicht",
    eyebrow: "Zeehondentocht",
    title: "Zeehondentochten Vlieland: spotten op de zandbanken",
    intro: "Per boot vanaf de haven naar de zandbanken in de Waddenzee: gewone én grijze zeehonden van dichtbij, zonder ze te storen.",
  },
  summary:
    "Een zeehondentocht op Vlieland is een begeleide boottocht van ongeveer 45 minuten vanaf de reddingbootsteiger in de jachthaven van Oost-Vlieland naar de zandbanken in de Waddenzee, waar gewone en grijze zeehonden rusten. De vertrektijd volgt het getij (rond laag water). De prijs is €32,50 per persoon; de tocht wordt geboekt vanaf 10 personen, met maximaal 40 deelnemers per afvaart.",
  facts: [
    { icon: Clock, label: "Duur", value: "Circa 45 minuten" },
    { icon: Euro, label: "Prijs", value: "€32,50 p.p." },
    { icon: CalendarDays, label: "Seizoen", value: "Voorjaar t/m najaar, piek juni tot en met september" },
    { icon: Users, label: "Groepsgrootte", value: "10 tot 40 personen" },
  ],
  intro: {
    title: "Op een steenworp van de kolonies",
    paragraphs: [
      "Vlieland ligt midden in het Werelderfgoed Waddenzee, en op een steenworp afstand liggen de beroemde zandbanken (zoals de Richel) waar honderden zeehonden uitrusten. Tijdens een zeehondentocht vaart u vanaf de haven met een ervaren schipper het wad op, op zoek naar gewone en grijze zeehonden. Op afstand, met respect voor de dieren, maar zo dichtbij dat u ze prachtig kunt bekijken.",
      "De vaartocht duurt ongeveer 45 minuten en wordt afgestemd op het getij: bij laag water zijn de zandplaten droog en liggen de zeehonden erop te rusten. Onderweg vertelt de schipper over het wad, de eilanden en hoe deze unieke zee werkt.",
    ],
    trust: [
      { icon: ShieldCheck, title: "Lokale, ervaren schippers" },
      { icon: Users, title: "Geschikt voor alle leeftijden" },
    ],
  },
  sections: [
    {
      kind: "split",
      title: "Welke zeehonden ziet u rond Vlieland?",
      paragraphs: [
        "In de Waddenzee leven twee soorten: de gewone zeehond, kleiner, met een rond kopje en vaak in grote groepen, en de grijze zeehond, met zijn langere snuit en stevige postuur het grootste roofdier van Nederland. Beide soorten zijn vrijwel zeker te zien op de zandbanken rond Vlieland; vooral op de Richel komen ze met honderden tegelijk samen.",
      ],
      image: { src: sealTourImage, alt: "Zeehondentocht per boot bij Vlieland" },
    },
    {
      kind: "prose",
      title: "Wanneer kunt u het beste zeehonden spotten?",
      paragraphs: [
        "Zeehonden liggen op de zandbanken zodra die droogvallen, dus rond laag water. De vertrektijd van de tocht schuift daarom elke dag mee met het getij; soms vaart u 's ochtends, soms halverwege de middag. Van juni tot en met september is de kans het grootst: dan zijn de kolonies het grootst en is het water rustig. Ook in het voor- en naseizoen worden vrijwel altijd zeehonden gezien, alleen vaart er dan minder vaak een boot. Plant u met een groep? Geef ons uw datum, dan zoeken wij het afvaartvenster erbij dat in uw dagindeling past.",
        "[Liever te voet het wad op?](/wadlopen-vlieland) Een wadexcursie volgt hetzelfde getijderitme en is goed te combineren met de boottocht.",
      ],
    },
    {
      kind: "prose",
      spacing: "compact",
      title: "Waarom een zeehondentocht vanaf Vlieland?",
      paragraphs: [
        "Vlieland ligt korter bij de grote zeehondenkolonies dan vrijwel elk ander vertrekpunt. Dat betekent: minder varen, meer tijd bij de dieren. Dat wij Werelderfgoed-ambassadeur zijn helpt: wij werken met aanbieders die het gebied kennen en respecteren. Geen toeristische pretboot, maar een serieuze natuurtocht.",
      ],
    },
    {
      kind: "prose",
      spacing: "compact",
      title: "Voor groepen: als onderdeel van uw dag op Vlieland",
      paragraphs: [
        "Voor bedrijfsuitjes, teambuilding of familieweekenden combineren wij de zeehondentocht graag met de overtocht vanuit Harlingen, fietsverhuur, een lunch in het dorp en eventueel een wadexcursie.",
      ],
      closing: "Eén aanvraag, één aanspreekpunt, één factuur.",
    },
    {
      kind: "features",
      title: "Praktisch",
      columns: 2,
      items: [
        { icon: Clock, title: "Duur", text: "Circa 45 minuten varen, afgestemd op het tij." },
        { icon: Anchor, title: "Vertrekpunt", text: "Reddingbootsteiger, jachthaven Oost-Vlieland; vertrektijden rond laagwater." },
        { icon: Users, title: "Voor wie", text: "Alle leeftijden. Vanaf 10 tot maximaal 40 deelnemers per afvaart." },
        { icon: MapPin, title: "Waar ziet u ze", text: "Zandbanken in de Waddenzee (onder andere de Richel) rond Vlieland." },
      ],
      notes: [
        "Meenemen: warme, winddichte kleding (ook in de zomer), een verrekijker, zonnebrand en een pet bij zon, en zelf drinken.",
      ],
    },
  ],
  booking: {
    blockId: "zeehondentocht",
    title: "Boek uw zeehondentocht op Vlieland",
    intro: "Reserveer een individuele plek direct online, of laat ons de tocht inplannen als onderdeel van een compleet programma voor uw groep.",
    introRequest: "Vraag een individuele plek aan, of laat ons de tocht inplannen als onderdeel van een compleet programma voor uw groep.",
    price: "€32,50 per persoon",
    priceNote: "exclusieve afvaart met de hele boot: €425 totaal",
    bookLabel: "Boek uw zeehondentocht",
    requestLabel: "Vraag uw zeehondentocht aan",
    requestPath: "/snel-aanvragen?categorie=excursies&onderwerp=zeehondentocht",
    groupRequestPath: "/snel-aanvragen?categorie=excursies&onderwerp=zeehondentocht-groep",
    trustBookable: "Direct online te boeken",
    trustRequest: "Onderdeel van een groepsprogramma mogelijk",
  },
  faqTitle: "Veelgestelde vragen over de zeehondentocht op Vlieland",
  faq: [
    {
      question: "Wat is een zeehondentocht op Vlieland?",
      answer:
        "Een zeehondentocht is een begeleide boottocht vanaf de haven van Oost-Vlieland naar de zandbanken in de Waddenzee waar zeehonden uitrusten. Met een verrekijker (en vaak ook met het blote oog) ziet u grijze en gewone zeehonden van dichtbij, zonder ze te storen.",
    },
    {
      question: "Hoe lang duurt een zeehondentocht vanaf Vlieland?",
      answer:
        "De vaartocht duurt ongeveer 45 minuten. Reken met in- en uitstappen op ruim een uur in uw programma. Vertrek is vanaf de reddingbootsteiger in de jachthaven van Oost-Vlieland.",
    },
    {
      question: "Wat is de beste tijd om zeehonden te spotten?",
      answer:
        "Zeehonden liggen vooral rond laag water op de zandbanken, dan zijn de banken droog. De vertrektijden worden daarom afgestemd op het getij. In de zomer (juni tot en met september) is de kans het grootst, maar ook in andere seizoenen worden vrijwel altijd zeehonden gezien.",
    },
    {
      question: "Welke zeehonden ziet u rond Vlieland?",
      answer:
        "Twee soorten: de gewone zeehond (kleiner, ronder kopje) en de grote grijze zeehond (langere snuit, fors). Bij Vlieland, vooral op de Richel, komen ze in grote groepen voor.",
    },
    {
      question: "Is een zeehondentocht geschikt voor kinderen?",
      answer:
        "Ja. De tocht is kort (circa 45 minuten) en de schipper vertelt onderweg over de zeehonden, het wad en de eilanden. Houd er rekening mee dat u op een open boot vaart: warme, winddichte kleding is ook in de zomer verstandig.",
    },
    {
      question: "Wat moet ik meenemen?",
      answer:
        "Warme, winddichte kleding (ook in de zomer kan het op het water fris zijn), een verrekijker en eventueel zonnebrand of een pet. Neem zelf drinken mee; ga er niet vanuit dat er aan boord iets te koop is.",
    },
    {
      question: "Wat kost een zeehondentocht vanaf Vlieland?",
      answer:
        "€32,50 per persoon. Een exclusieve afvaart met de hele boot voor uw eigen gezelschap kost €425 in totaal. Prijzen zijn onder voorbehoud van beschikbaarheid en getij.",
    },
    {
      question: "Kan een groep een zeehondentocht boeken?",
      answer:
        "Ja. De tocht wordt geboekt vanaf 10 personen, met maximaal 40 deelnemers per afvaart. Grotere gezelschappen splitsen wij over twee vaarten. Wij plannen de afvaart op een tijd die past in uw programma en verwerken die in één aanvraag en één factuur.",
    },
  ],
  reviews: { title: "Reviews over Bureau Vlieland", subtitle: "Wat klanten zeggen over hun dag op het wad" },
  also: [
    { label: "Wadexcursie op Vlieland", to: "/wadlopen-vlieland", description: "Met een gids het wad op rond Vlieland" },
    { label: "Alle activiteiten op Vlieland", to: "/activiteiten-vlieland", description: "Wat kunt u doen op het eiland, per seizoen" },
    { label: "Familieweekend op Vlieland", to: "/familieweekend-vlieland" },
    { label: "Bedrijfsuitje op Vlieland", to: "/bedrijfsuitje-vlieland" },
    { label: "Voorbeeldprogramma's", to: "/voorbeeldprogrammas", description: "Kant-en-klare dagindelingen van eerdere groepen" },
    { label: "Overnachten op Vlieland", to: "/logies-vlieland", description: "Hotels, groepsaccommodaties en kamperen" },
  ],
};
