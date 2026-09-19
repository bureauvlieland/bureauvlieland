import { BedDouble, Brain, Clock, Focus } from "lucide-react";
import heroImage from "@/assets/dunes-group.jpg";
import lighthouseImage from "@/assets/lighthouse-vlieland.jpg";
import vlielandLandscapeImage from "@/assets/vlieland-landscape.jpg";
import outdoorDiningImage from "@/assets/outdoor-dining.jpg";
import { ISLAND_FACTS, LOGIES_LINK } from "./shared";
import type { LandingContent } from "./types";

const description =
  "Een heisessie op Vlieland: rust, focus en ruimte voor strategie. Bureau Vlieland regelt locatie, logies, catering en logistiek.";

export const heisessieVlieland: LandingContent = {
  slug: "heisessie-vlieland",
  path: "/heisessie-vlieland",
  breadcrumb: "Heisessie Vlieland",
  parent: { label: "Bedrijfsuitje Vlieland", to: "/bedrijfsuitje-vlieland" },
  seo: { title: "Heisessie op Vlieland – rust en focus voor strategie", description },
  service: { name: "Heisessie op Vlieland", description },
  hero: {
    image: heroImage,
    alt: "Heisessie in de duinen van Vlieland",
    eyebrow: "Heisessie",
    title: "Heisessie op Vlieland",
    intro: "De ideale omgeving voor organisaties die in alle rust willen werken aan strategie, visie of samenwerking.",
  },
  intro: {
    title: "Het eiland dwingt tot vertraging",
    paragraphs: [
      "Weg van de dagelijkse omgeving ontstaat ruimte voor focus, reflectie en de gesprekken die er echt toe doen.",
      "Wij zijn uitsluitend op Vlieland actief en kennen de rustigste locaties, vaste gastheren en de juiste plekken voor een groep die niet gestoord wil worden.",
    ],
  },
  facts: ISLAND_FACTS,
  sections: [
    {
      kind: "features",
      title: "Waarom Vlieland voor een heisessie?",
      columns: 3,
      items: [
        { icon: Focus, title: "Volledige focus", text: "Geen afleiding, geen verplichtingen tussendoor." },
        { icon: Clock, title: "Tijd voor verdieping", text: "Ruimte voor gesprekken die ertoe doen." },
        { icon: Brain, title: "Strategisch denken", text: "De ideale setting voor visie en richting." },
      ],
    },
    {
      kind: "gallery",
      title: "Wij verzorgen de randvoorwaarden",
      intro: "De inhoud bepaalt u, de organisatie regelen wij. Van locatie tot logistiek, van overnachting tot catering.",
      images: [
        { src: lighthouseImage, alt: "Vuurtoren van Vlieland", title: "Inspirerende locaties", text: "Vergaderruimtes met uitzicht, sessies in de natuur of privésettings." },
        { src: vlielandLandscapeImage, alt: "Landschap van Vlieland", title: "Rust en ruimte", text: "Wandelingen door de duinen, fietsen over het eiland, tijd om na te denken." },
        { src: outdoorDiningImage, alt: "Diner buiten op Vlieland", title: "Catering op niveau", text: "Van werklunch tot verzorgd diner, passend bij de setting." },
      ],
      aside: {
        icon: BedDouble,
        title: "Meerdaagse heisessie",
        text: "Een heisessie combineren met een overnachting zorgt voor nog meer verdieping en informele momenten.",
        link: { label: "Bekijk meerdaagse opties", to: "/meerdaags-bedrijfsuitje-vlieland" },
      },
    },
    {
      kind: "split",
      title: "Voor MT's, directies en projectteams",
      paragraphs: [
        "Een heisessie op Vlieland is ideaal voor teams die strategisch willen nadenken over de toekomst, complexe vraagstukken willen bespreken of simpelweg ruimte nodig hebben voor verdieping.",
      ],
      checklist: ["Strategiesessies en jaarplannen", "MT-dagen en directieoverleg", "Teamreflectie en koersbepaling", "Complexe besluitvorming"],
      image: { src: heroImage, alt: "Groep tijdens een heisessie" },
    },
  ],
  templates: {
    title: "Voorbeeldprogramma's om van te starten",
    intro: "Programma's van eerdere groepen, met ruimte voor werk en ontspanning.",
  },
  quote: {
    text: "Na zes maanden in het geheim samen een planning maken, dingen regelen en ons zorgen maken over het weer, was het eindelijk zo ver. Vanaf het moment dat wij op de boot zaten hadden deze jongens het allemaal onder controle. Alles liep perfect.",
    author: "Ilona Norbart",
    company: "Districon Group",
  },
  faq: [
    {
      question: "Welke locaties op Vlieland zijn geschikt voor een heisessie?",
      answer:
        "Wij werken met afgesloten zalen in hotels, strandpaviljoens en duinlocaties. Welke locatie passend is hangt af van groepsgrootte, het gewenste karakter (formeel of informeel) en of er overnacht wordt.",
    },
    {
      question: "Hoe lang duurt een heisessie op Vlieland?",
      answer:
        "De meeste heisessies duren twee dagen met één overnachting. Dat geeft een volwaardig werkdeel én ruimte voor informele reflectie 's avonds en een korte ochtendsessie de tweede dag.",
    },
    {
      question: "Wat kost een heisessie op Vlieland?",
      answer:
        "Indicatie: € 350 tot € 550 per persoon voor een tweedaagse heisessie inclusief logies, vergaderlocatie en catering. De exacte prijs hangt af van locatie en groepsgrootte; u ontvangt een offerte op maat.",
    },
    {
      question: "Kunnen wij een heisessie combineren met een teamuitje?",
      answer:
        "Ja, een halve dag teamuitje op Vlieland combineert goed met een vergaderochtend. Zie ook onze pagina over een teamuitje op Vlieland voor activiteiten.",
    },
  ],
  also: [
    { label: "Bedrijfsuitje Vlieland", to: "/bedrijfsuitje-vlieland" },
    { label: "Meerdaags bedrijfsuitje Vlieland", to: "/meerdaags-bedrijfsuitje-vlieland" },
    { label: "Zakelijk evenement Vlieland", to: "/zakelijk-evenement-vlieland" },
    LOGIES_LINK,
  ],
};
