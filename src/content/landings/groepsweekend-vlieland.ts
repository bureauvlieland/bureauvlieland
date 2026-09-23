import { BedDouble, Flag, Trophy, Users } from "lucide-react";
import heroImage from "@/assets/vlieland-group.jpg";
import beachActivityImage from "@/assets/beach-activity.jpg";
import cyclingGroupImage from "@/assets/cycling-group.jpg";
import outdoorDrinksImage from "@/assets/outdoor-drinks.jpg";
import { ISLAND_FACTS, LOGIES_LINK } from "./shared";
import type { LandingContent } from "./types";

const description =
  "Een groepsweekend op Vlieland, op maat samengesteld voor vriendengroepen, sportclubs en verenigingen: activiteiten, logies, catering en overtocht in één aanvraag.";

export const groepsweekendVlieland: LandingContent = {
  slug: "groepsweekend-vlieland",
  path: "/groepsweekend-vlieland",
  breadcrumb: "Groepsweekend Vlieland",
  parent: { label: "Voor wie", to: "/voor-wie" },
  seo: { title: "Groepsweekend op Vlieland op maat | Vereniging, club of vriendengroep", description },
  service: { name: "Groepsweekend op Vlieland", description },
  hero: {
    image: heroImage,
    alt: "Groep vrienden op Vlieland",
    eyebrow: "Groepsweekend",
    title: "Groepsweekend op Vlieland",
    intro: "Van vriendenweekend tot verenigingsuitje: wij maken er een onvergetelijke ervaring van.",
  },
  intro: {
    title: "Samen ontsnappen aan de drukte",
    paragraphs: [
      "Een groepsweekend op Vlieland is de perfecte manier om samen te ontsnappen aan de drukte van alledag. Of u nu met een vriendengroep komt, een sportclub of een vereniging: wij zorgen voor een programma dat past bij uw wensen en budget.",
      "Wij zijn uitsluitend op Vlieland actief en werken al jaren met dezelfde vaste gidsen, koks en hoteliers. Geen wisselende onderaannemers, maar mensen die wij persoonlijk kennen.",
    ],
  },
  facts: ISLAND_FACTS,
  sections: [
    {
      kind: "features",
      title: "Voor wie is dit geschikt?",
      columns: 3,
      items: [
        { icon: Users, title: "Vriendengroepen", text: "Van studievrienden tot oud-huisgenoten: een weekend weg om bij te praten en samen te genieten." },
        { icon: Trophy, title: "Sportclubs", text: "Hockey, voetbal, tennis of hardlopen: combineer sportieve activiteiten met gezelligheid." },
        { icon: Flag, title: "Verenigingen", text: "Studentenverenigingen, buurtclubs of hobbygroepen: samen eropuit voor een memorabel weekend." },
      ],
    },
    {
      kind: "gallery",
      title: "Wat wij verzorgen",
      intro: "Van activiteiten tot overnachting: wij regelen alles voor uw groepsweekend.",
      images: [
        { src: beachActivityImage, alt: "Strandactiviteit op Vlieland", title: "Activiteiten", text: "Van beachvolleybal tot eilandspellen, fietstochten tot escape rooms." },
        { src: cyclingGroupImage, alt: "Groep fietst over Vlieland", title: "Vervoer en fietsen", text: "Fietsverhuur, groepsvervoer en logistieke ondersteuning op het eiland." },
        { src: outdoorDrinksImage, alt: "Borrel buiten op Vlieland", title: "Catering en horeca", text: "BBQ op locatie, diner in een restaurant of borrel bij zonsondergang." },
      ],
      aside: {
        icon: BedDouble,
        title: "Logies",
        text: "Van groepsaccommodaties tot appartementen: wij helpen u aan de juiste overnachting voor de hele groep.",
        link: { label: "Bekijk logiesopties", to: "/logies-vlieland" },
      },
    },
  ],
  templates: {
    title: "Voorbeeldprogramma's voor een weekend",
    intro: "Programma's van eerdere groepen, als vertrekpunt voor uw eigen weekend.",
    minDays: 2,
  },
  quote: {
    text: "Aanrader voor groepen die een leuke dag willen hebben met een super sfeertje. Lunch in de natuur, BBQ op het strand, ribboottocht, activiteit op het strand en ook lekker een terrasje pakken.",
    author: "Rients",
    company: "Raethuis Accountants Heerenveen",
  },
  faq: [
    {
      question: "Voor hoeveel personen kan Bureau Vlieland een groepsweekend organiseren?",
      answer:
        "Van kleine groepen vanaf 8 personen tot groepen van 80 en meer. Voor grotere groepen combineren wij meerdere logies of werken wij met een groepsaccommodatie of hotelovername.",
    },
    {
      question: "Wat kost een groepsweekend op Vlieland?",
      answer:
        "Een groepsweekend start vanaf ongeveer € 195 per persoon voor twee nachten inclusief basisprogramma, exclusief overtocht. De prijs varieert met logiestype, activiteiten en catering.",
    },
    {
      question: "Welke logies zijn geschikt voor een grotere groep op Vlieland?",
      answer:
        "Groepsaccommodaties, vakantiehuizenparken, hotels met blokboeking en in een enkel geval een volledig pension. Wij stemmen het logiestype af op groepsgrootte en gewenste sfeer.",
    },
    {
      question: "Hoe regelt Bureau Vlieland de overtocht voor de groep?",
      answer:
        "Wij boeken de overtocht met Doeksen voor de hele groep op één reservering en sturen u de tickets centraal toe. Op drukke data adviseren wij vroeg te boeken, met heen- en terugreis op één boekingsreferentie.",
    },
  ],
  also: [
    { label: "Jubileum vieren", to: "/jubileum-vlieland" },
    { label: "Familieweekend Vlieland", to: "/familieweekend-vlieland" },
    { label: "Activiteiten op Vlieland", to: "/activiteiten-vlieland" },
    LOGIES_LINK,
  ],
};
