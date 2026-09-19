import { Cake, GraduationCap, Heart, PartyPopper, Tent } from "lucide-react";
import heroImage from "@/assets/outdoor-dining.jpg";
import sunsetDinnerImage from "@/assets/sunset-dinner.jpg";
import outdoorDrinksImage from "@/assets/outdoor-drinks.jpg";
import { ISLAND_FACTS, LOGIES_LINK } from "./shared";
import type { LandingContent } from "./types";

const description =
  "Een jubileum vieren op Vlieland: verjaardag, pensioen of huwelijksjubileum. Bureau Vlieland regelt locatie, catering, logies voor uw gasten en het programma.";

export const jubileumVlieland: LandingContent = {
  slug: "jubileum-vlieland",
  path: "/jubileum-vlieland",
  breadcrumb: "Jubileum vieren",
  parent: { label: "Voor wie", to: "/voor-wie" },
  seo: { title: "Jubileum vieren op Vlieland | Bureau Vlieland", description },
  service: { name: "Jubileum vieren op Vlieland", description },
  hero: {
    image: heroImage,
    alt: "Feestelijk diner buiten op Vlieland",
    eyebrow: "Jubileum",
    title: "Jubileum vieren op Vlieland",
    intro: "Maak van uw verjaardag, pensioen of huwelijksjubileum een onvergetelijke viering.",
  },
  intro: {
    title: "Een mijlpaal verdient een eiland",
    paragraphs: [
      "Een jubileum verdient een bijzondere viering. Vlieland biedt de perfecte setting: rust, ruimte en een unieke sfeer. Of u nu een intiem diner voor 20 personen organiseert of een groot feest voor 100 gasten, wij helpen u met de juiste invulling.",
      "Een feest organiseren op een eiland vraagt om goede planning. Wij kennen Vlieland als geen ander en zorgen ervoor dat alles op rolletjes loopt.",
    ],
  },
  facts: ISLAND_FACTS,
  sections: [
    {
      kind: "features",
      title: "Welke gelegenheid viert u?",
      columns: 2,
      items: [
        { icon: Cake, title: "Verjaardag", text: "50 jaar, Abraham of Sara: maak er een weekend van." },
        { icon: PartyPopper, title: "Pensioen", text: "Afscheid nemen in stijl met collega's en dierbaren." },
        { icon: Heart, title: "Huwelijksjubileum", text: "25 of 50 jaar getrouwd: vier het met een eilandfeest." },
        { icon: GraduationCap, title: "Bijzondere mijlpaal", text: "Promotie, afstuderen of een andere reden om te vieren." },
      ],
    },
    {
      kind: "gallery",
      title: "Wij verzorgen de details",
      intro: "Van het diner tot de aankleding en de overnachting van uw gasten: één aanspreekpunt, één factuur.",
      images: [
        { src: sunsetDinnerImage, alt: "Diner bij zonsondergang op Vlieland", title: "Catering en diner", text: "Van walking dinner tot meergangenmenu, BBQ op locatie of borrel met hapjes." },
        { src: outdoorDrinksImage, alt: "Borrel buiten op Vlieland", title: "Activiteiten", text: "Een eilandtour, zeehondentocht of creatieve workshop voor uw gasten." },
      ],
      aside: {
        icon: Tent,
        title: "Locatie en materialen",
        text: "Tenten, meubilair, decoratie en aankleding: alles voor de juiste sfeer op een strandpaviljoen, in een privézaal of buiten in de duinen.",
        link: { label: "Bekijk de cateringopties", to: "/catering" },
      },
    },
  ],
  templates: {
    title: "Voorbeeldprogramma's om van te starten",
    intro: "Programma's van eerdere groepen, als inspiratie voor uw eigen viering.",
  },
  quote: {
    text: "Vanaf de allereerste bespreking tot en met het afscheid bij de terminal twee dagen later in Harlingen heeft het team van Bureau Vlieland dit weekend tot in detail onvergetelijk gemaakt voor een ieder.",
    author: "Peter-Paul van de Kar",
    company: "Tradekar International BV",
  },
  faq: [
    {
      question: "Welke locaties zijn geschikt om een jubileum op Vlieland te vieren?",
      answer:
        "Strandpaviljoens, restaurants met privézaal, hotelzalen en in de zomer ook buitenlocaties in de duinen. Wij selecteren een locatie die past bij het karakter van het jubileum en het aantal gasten.",
    },
    {
      question: "Voor hoeveel gasten kan Bureau Vlieland een jubileum organiseren?",
      answer:
        "Van intieme diners voor 10 personen tot feesten voor 150 gasten en meer. Voor grote gezelschappen werken wij met meerdere logies en regelen wij de groepslogistiek volledig voor u.",
    },
    {
      question: "Wat kost een jubileumfeest op Vlieland?",
      answer:
        "Een eendaags jubileumdiner met locatie en catering start vanaf ongeveer € 125 per persoon. Een jubileumweekend met overnachting en aanvullend programma ligt vanaf € 295 per persoon.",
    },
    {
      question: "Regelt Bureau Vlieland ook catering en overnachtingen voor de gasten?",
      answer:
        "Ja. Bureau Vlieland verzorgt alles: locatie, catering, overnachtingen voor uw gasten, eventuele activiteiten en de overtocht. Eén aanspreekpunt, één factuur.",
    },
  ],
  also: [
    { label: "Familieweekend Vlieland", to: "/familieweekend-vlieland" },
    { label: "Groepsweekend Vlieland", to: "/groepsweekend-vlieland" },
    { label: "Catering bekijken", to: "/catering" },
    LOGIES_LINK,
  ],
};
