import { Bike, Camera, PenLine, Ship, Utensils } from "lucide-react";
import heroImage from "@/assets/beach-activity.jpg";
import cyclingImage from "@/assets/cycling-group.jpg";
import speedboatImage from "@/assets/speedboat.jpg";
import cateringImage from "@/assets/food-platters.jpg";
import { ISLAND_FACTS, LOGIES_LINK } from "./shared";
import type { LandingContent } from "./types";

const description =
  "Ideeën voor een bedrijfsuitje op Vlieland: actief, op het water, culinair of verdiepend. Bureau Vlieland vertaalt ideeën naar één samenhangend programma.";

export const bedrijfsuitjeIdeeenVlieland: LandingContent = {
  slug: "bedrijfsuitje-ideeen-vlieland",
  path: "/bedrijfsuitje-ideeen-vlieland",
  breadcrumb: "Bedrijfsuitje ideeën Vlieland",
  parent: { label: "Bedrijfsuitje Vlieland", to: "/bedrijfsuitje-vlieland" },
  seo: { title: "Bedrijfsuitje ideeën op Vlieland – inspiratie en maatwerk", description },
  service: { name: "Bedrijfsuitje ideeën op Vlieland", description },
  hero: {
    image: heroImage,
    alt: "Activiteiten tijdens een bedrijfsuitje op Vlieland",
    eyebrow: "Inspiratie",
    title: "Bedrijfsuitje ideeën op Vlieland",
    intro:
      "Zoekt u inspiratie voor een bedrijfsuitje? Het eiland biedt talloze mogelijkheden, van actief tot verdiepend. Wij vertalen ideeën naar een samenhangend programma.",
  },
  intro: {
    title: "Meer dan een leuk idee",
    paragraphs: [
      "Een goed bedrijfsuitje is meer dan een leuk idee. Wij helpen bij het kiezen, combineren en organiseren van onderdelen tot één logisch geheel.",
      "Wij zijn uitsluitend op Vlieland actief en werken al jaren met dezelfde vaste gidsen, koks en hoteliers: geen wisselende onderaannemers, maar mensen die wij persoonlijk kennen.",
    ],
  },
  facts: ISLAND_FACTS,
  sections: [
    {
      kind: "features",
      title: "Mogelijkheden op Vlieland",
      columns: 2,
      items: [
        { icon: Bike, title: "Actief en buiten", text: "Fietsen, surfen, beachsporten of eilandspellen." },
        { icon: Ship, title: "Water en natuur", text: "Zeehondentocht, speedboot of wadlopen." },
        { icon: Utensils, title: "Culinair", text: "BBQ, diner bij zonsondergang of walking dinner." },
        { icon: Camera, title: "Beleving", text: "Vuurtorenbezoek, dorpstour of silent disco." },
      ],
      closing: "Alle onderdelen staan bij de [bouwstenen](/bouwstenen), met prijs per onderdeel.",
    },
    {
      kind: "gallery",
      title: "Laat u inspireren",
      intro: "Van actieve outdooractiviteiten tot inhoudelijke sessies, altijd op maat samengesteld.",
      images: [
        { src: cyclingImage, alt: "Groep fietst over Vlieland", title: "Eiland verkennen", text: "Per fiets, e-bike of te voet door de duinen en het dorp." },
        { src: speedboatImage, alt: "Speedboottocht", title: "Avontuur op het water", text: "Speedboot, zeehondentocht of privérondvaart over de Waddenzee." },
        { src: cateringImage, alt: "Rijkgevulde borrelplanken, catering op Vlieland", title: "Culinaire ervaringen", text: "BBQ op locatie, walking dinner of luxe meergangenmenu." },
      ],
      aside: {
        icon: PenLine,
        title: "Zelf combineren",
        text: "Stel uw eigen programma samen uit alle beschikbare onderdelen. Wij zorgen voor de afstemming.",
        link: { label: "Begin met samenstellen", to: "/programma-samenstellen" },
      },
    },
    {
      kind: "prose",
      title: "Van idee naar programma",
      paragraphs: ["Afhankelijk van uw doel en groep adviseren wij een passend type programma."],
      checklist: [
        "[Teamuitje](/teamuitje-vlieland): focus op samenwerking en verbinding",
        "[Meerdaags bedrijfsuitje](/meerdaags-bedrijfsuitje-vlieland): met overnachting voor verdieping",
        "[Incentive reis](/incentive-reis-vlieland): exclusieve beleving als beloning",
      ],
    },
  ],
  templates: {
    title: "Voorbeeldprogramma's ter inspiratie",
    intro: "Complete dagindelingen van eerdere groepen, om van te starten of ideeën op te doen.",
  },
  quote: {
    text: "Erg plezierig contact, goede begeleiding en een heel ontspannen dag gehad op Vlieland. Lunch in de natuur, BBQ op het strand, een ribboottocht, een activiteit op het strand en ook lekker een terrasje pakken. Voor herhaling vatbaar.",
    author: "Rients",
    company: "Raethuis Accountants Heerenveen",
  },
  faq: [
    {
      question: "Welke originele ideeën zijn er voor een bedrijfsuitje op Vlieland?",
      answer:
        "Een wadexcursie met gids, blokarten op het strand, powerkiten, een Vliehors-Expreststocht, een kookworkshop met een lokale chef, of een avondsurvival in de duinen. Wij combineren onderdelen op maat.",
    },
    {
      question: "Wat is een goed bedrijfsuitje voor een klein team?",
      answer:
        "Voor teams tot 12 personen werkt een combinatie van een actieve ochtend (bijvoorbeeld zeilen of blokarten), een gezamenlijke lunch en een reflectiesessie op een rustige locatie het beste.",
    },
    {
      question: "Welke actieve bedrijfsuitjes kunnen wij op Vlieland doen?",
      answer:
        "Blokarten, powerkiten, zeilen, mountainbiken door het duingebied, paardrijden langs de vloedlijn en georganiseerde duinwandelingen. Allemaal te combineren in één programma.",
    },
    {
      question: "Hoe combineert u een actief bedrijfsuitje met ontspanning?",
      answer:
        "Plan een actieve ochtend, gevolgd door een uitgebreide lunch en een rustig middagprogramma, bijvoorbeeld een wandeling met een natuurgids of een bezoek aan museum Tromp's Huys.",
    },
  ],
  also: [
    { label: "Bedrijfsuitje Vlieland", to: "/bedrijfsuitje-vlieland" },
    { label: "Teamuitje Vlieland", to: "/teamuitje-vlieland" },
    { label: "Meerdaags bedrijfsuitje Vlieland", to: "/meerdaags-bedrijfsuitje-vlieland" },
    LOGIES_LINK,
  ],
};
