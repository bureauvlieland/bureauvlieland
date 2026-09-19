import { BedDouble, Compass, Heart, ShieldCheck } from "lucide-react";
import heroImage from "@/assets/dunes-group.jpg";
import beachActivityImage from "@/assets/beach-activity.jpg";
import sealTourImage from "@/assets/seal-tour.jpg";
import kiteImage from "@/assets/kite-flying.jpg";
import outdoorDiningImage from "@/assets/outdoor-dining.jpg";
import { ISLAND_FACTS, LOGIES_LINK } from "./shared";
import type { LandingContent } from "./types";

const description =
  "Een familieweekend op Vlieland: van opa en oma tot kleinkinderen. Bureau Vlieland regelt groepsaccommodatie, activiteiten voor alle leeftijden, catering en overtocht.";

export const familieweekendVlieland: LandingContent = {
  slug: "familieweekend-vlieland",
  path: "/familieweekend-vlieland",
  breadcrumb: "Familieweekend Vlieland",
  parent: { label: "Voor wie", to: "/voor-wie" },
  seo: { title: "Familieweekend op Vlieland organiseren | Bureau Vlieland", description },
  service: { name: "Familieweekend op Vlieland", description },
  hero: {
    image: heroImage,
    alt: "Familie in de duinen van Vlieland",
    eyebrow: "Familieweekend",
    title: "Familieweekend op Vlieland",
    intro: "Van opa en oma tot kleinkinderen: maak samen herinneringen op het mooiste Waddeneiland.",
  },
  intro: {
    title: "De hele familie bij elkaar",
    paragraphs: [
      "Een familieweekend op Vlieland is dé manier om de hele familie bij elkaar te brengen. Geen drukte, geen autoverkeer, wel eindeloze stranden, prachtige natuur en activiteiten voor alle leeftijden. Wij helpen u het weekend samen te stellen.",
      "Wij zijn uitsluitend op Vlieland actief en kennen elke strandplek, speeltuin en kindvriendelijke aanbieder van het eiland. Persoonlijk advies, geen algemene lijst.",
    ],
  },
  facts: ISLAND_FACTS,
  sections: [
    {
      kind: "features",
      title: "Waarom Vlieland perfect is voor families",
      columns: 3,
      items: [
        { icon: ShieldCheck, title: "Veilig en autoluw", text: "Geen druk verkeer, kinderen kunnen vrij spelen. Het hele eiland is uw speeltuin." },
        { icon: Compass, title: "Avontuur voor iedereen", text: "Van schelpjes zoeken met de kleintjes tot fietsen door de duinen met opa en oma." },
        { icon: Heart, title: "Tijd voor elkaar", text: "Geen afleiding van alledag, alleen tijd voor elkaar en de mooie omgeving." },
      ],
    },
    {
      kind: "gallery",
      title: "Activiteiten voor alle leeftijden",
      intro: "Van actief tot ontspannen: voor ieder familielid is er iets leuks.",
      images: [
        { src: beachActivityImage, alt: "Strandactiviteit voor families op Vlieland", title: "Strandspelen", text: "Beachvolleybal, vliegeren, schelpen zoeken of zandkastelen bouwen." },
        { src: sealTourImage, alt: "Zeehondentocht op Vlieland", title: "Natuur ontdekken", text: "Zeehondentochten, vogels spotten en wadlopen voor jong en oud." },
        { src: kiteImage, alt: "Vliegeren op het strand van Vlieland", title: "Samen actief", text: "Fietsen, powerkiten of een eilandspel met de hele familie." },
      ],
      aside: {
        icon: BedDouble,
        title: "Groepsaccommodaties",
        text: "Van grote vakantiehuizen tot meerdere appartementen naast elkaar: wij vinden de juiste overnachting voor uw familie, ongeacht de grootte.",
        link: { label: "Bekijk logiesopties", to: "/logies-vlieland" },
      },
    },
    {
      kind: "split",
      title: "Zelf koken of laten verzorgen?",
      paragraphs: [
        "Van BBQ-pakketten die wij bij uw accommodatie bezorgen tot een volledig verzorgd diner op een strandpaviljoen: wij passen ons aan uw wensen aan. Ook met allergieën en kleine eters houden wij rekening.",
        "Bekijk de [cateringopties](/catering) of vraag ons om een voorstel dat past bij uw familie.",
      ],
      checklist: ["BBQ-pakket bij de accommodatie", "Lunch onderweg tijdens een fietstocht", "Diner in een restaurant of op het strand"],
      image: { src: outdoorDiningImage, alt: "Diner buiten met de familie op Vlieland" },
    },
  ],
  templates: {
    title: "Voorbeeldprogramma's voor een weekend",
    intro: "Programma's van eerdere groepen, als vertrekpunt voor uw eigen familieweekend.",
    minDays: 2,
  },
  faq: [
    {
      question: "Wat kost een familieweekend op Vlieland?",
      answer:
        "Een familieweekend start vanaf ongeveer € 175 per persoon voor twee nachten op basis van een groepsaccommodatie, exclusief overtocht en activiteiten. De prijs schaalt met logiestype en programma.",
    },
    {
      question: "Welke logies zijn geschikt voor een grote familie op Vlieland?",
      answer:
        "Groepsaccommodaties, vakantiehuizen voor 8 tot 20 personen en hotels met aangrenzende kamers. Wij selecteren een logies dat past bij de samenstelling van de groep, inclusief de slaapsituatie voor kinderen.",
    },
    {
      question: "Welke activiteiten zijn er voor kinderen op Vlieland?",
      answer:
        "Strandactiviteiten, wadexcursies, fietstochten, paardrijden, het avontuur met de Vliehors Expres en speurtochten door de duinen. Alles op veilige loopafstand en zonder druk autoverkeer.",
    },
    {
      question: "Wanneer kunnen wij het beste boeken voor een familieweekend?",
      answer:
        "Voor schoolvakanties en lange weekenden adviseren wij 3 tot 6 maanden vooraf te boeken; populaire groepsaccommodaties zijn dan snel volgeboekt. Buiten het seizoen volstaat 4 tot 6 weken vooraf.",
    },
  ],
  also: [
    { label: "Jubileum vieren", to: "/jubileum-vlieland" },
    { label: "Groepsweekend Vlieland", to: "/groepsweekend-vlieland" },
    { label: "Activiteiten op Vlieland", to: "/activiteiten-vlieland" },
    LOGIES_LINK,
  ],
};
