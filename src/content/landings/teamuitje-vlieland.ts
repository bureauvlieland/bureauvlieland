import { MapPin, MessageCircle, Target, Users } from "lucide-react";
import heroImage from "@/assets/cycling-group.jpg";
import beachActivityImage from "@/assets/beach-activity.jpg";
import dunesGroupImage from "@/assets/dunes-group.jpg";
import outdoorDrinksImage from "@/assets/outdoor-drinks.jpg";
import { ISLAND_FACTS, LOGIES_LINK } from "./shared";
import type { LandingContent } from "./types";

const description =
  "Teambuilding op Vlieland: een teamuitje met inhoud, gebouwd rond samenwerking en de gesprekken die op kantoor niet ontstaan. Activiteiten, catering en overtocht in één programma.";

export const teamuitjeVlieland: LandingContent = {
  slug: "teamuitje-vlieland",
  path: "/teamuitje-vlieland",
  breadcrumb: "Teambuilding Vlieland",
  parent: { label: "Bedrijfsuitje Vlieland", to: "/bedrijfsuitje-vlieland" },
  seo: { title: "Teambuilding op Vlieland | Teamuitje met inhoud op het Waddeneiland", description },
  service: { name: "Teambuilding op Vlieland", description },
  hero: {
    image: heroImage,
    alt: "Team tijdens een teamuitje op Vlieland",
    eyebrow: "Teambuilding",
    title: "Teambuilding op Vlieland",
    intro:
      "Samenwerken, elkaar beter leren kennen en loskomen van de dagelijkse dynamiek: een teamuitje op een eiland dat rust en focus geeft.",
  },
  intro: {
    title: "Waarom Vlieland voor teambuilding?",
    paragraphs: [
      "Door de kleinschaligheid van Vlieland ontstaat rust en focus. Dat maakt het eiland ideaal voor teamuitjes waarbij vertrouwen, communicatie en samenwerking centraal staan.",
    ],
  },
  facts: ISLAND_FACTS,
  sections: [
    {
      kind: "features",
      title: "Waar teams voor kiezen",
      columns: 3,
      items: [
        { icon: Users, title: "Kleine en middelgrote teams", text: "Programma's afgestemd op de groepsdynamiek." },
        { icon: Target, title: "Doelgericht", text: "Focus op samenwerking en verbinding." },
        { icon: MessageCircle, title: "Maatwerk", text: "Geen standaardformats, wel inhoud." },
      ],
    },
    {
      kind: "gallery",
      title: "Van activiteit naar totaalprogramma",
      intro:
        "Een teamuitje bestaat zelden uit één onderdeel. Wij combineren activiteiten met momenten van reflectie, ontspanning en samenzijn.",
      images: [
        {
          src: beachActivityImage,
          alt: "Teamactiviteit op het strand",
          title: "Actieve teambuilding",
          text: "Beachsporten, eilandspellen of een uitdagende tocht door de duinen.",
        },
        {
          src: dunesGroupImage,
          alt: "Groep in de duinen van Vlieland",
          title: "Reflectie en verbinding",
          text: "Ruimte voor gesprekken en teamdynamiek in een rustgevende omgeving.",
        },
        {
          src: outdoorDrinksImage,
          alt: "Borrel buiten op Vlieland",
          title: "Catering en ontspanning",
          text: "Borrel, lunch of diner, van informeel tot verzorgd.",
        },
      ],
      aside: {
        icon: MapPin,
        title: "Meerdaags programma",
        text: "Meer tijd nodig voor verdieping? Combineer het teamuitje met een overnachting op Vlieland.",
        link: { label: "Bekijk meerdaagse opties", to: "/meerdaags-bedrijfsuitje-vlieland" },
      },
    },
    {
      kind: "split",
      title: "Lokale specialist, korte lijnen",
      paragraphs: [
        "Als lokale organisatie weten wij wat werkt op Vlieland. Geen standaardformats, maar maatwerk afgestemd op uw doelen en groepsdynamiek.",
      ],
      checklist: [
        "Programma afgestemd op uw team",
        "Eén aanspreekpunt voor alles",
        "Logistiek volledig geregeld",
        "Lokale partners en kennis",
      ],
      image: { src: heroImage, alt: "Team fietst over Vlieland" },
    },
  ],
  templates: {
    title: "Voorbeelden van teamuitjes",
    intro: "Dagprogramma's van eerdere teams, om van te starten of ideeën op te doen.",
    durationDays: 1,
  },
  quote: {
    text: "Erg plezierig contact, goede begeleiding en een heel ontspannen dag gehad op Vlieland. Lunch in de natuur, BBQ op het strand, een ribboottocht, een activiteit op het strand en ook lekker een terrasje pakken. Voor herhaling vatbaar.",
    author: "Rients",
    company: "Raethuis Accountants Heerenveen",
  },
  faq: [
    {
      question: "Wat kost een teamuitje op Vlieland?",
      answer:
        "Een teamuitje op Vlieland start vanaf ongeveer € 95 per persoon voor een dagprogramma (excl. overtocht). De uiteindelijke prijs hangt af van groepsgrootte, activiteiten en eventuele overnachting.",
    },
    {
      question: "Hoe lang duurt een teamuitje op Vlieland?",
      answer:
        "Door de overtocht van 90 minuten is een dagdeel niet realistisch. Reken minimaal één volle dag; voor teambuilding met diepgang adviseren wij twee dagen met een overnachting.",
    },
    {
      question: "Welke teambuilding-activiteiten zijn er op Vlieland?",
      answer:
        "Wadexcursies, blokarten, powerkiten, zeilen, paardrijden langs het strand, duinwandelingen en kookworkshops. Wij combineren actieve en reflectieve onderdelen tot een programma dat samenwerking versterkt.",
    },
    {
      question: "Kunnen wij met de auto naar Vlieland voor een teamuitje?",
      answer:
        "Nee, Vlieland is autoluw. Auto's parkeert u in Harlingen; op het eiland gaat alles per fiets, te voet of met groepsvervoer dat wij regelen.",
    },
  ],
  also: [
    { label: "Bedrijfsuitje Vlieland", to: "/bedrijfsuitje-vlieland" },
    { label: "Bedrijfsuitje ideeën Vlieland", to: "/bedrijfsuitje-ideeen-vlieland" },
    { label: "Meerdaags bedrijfsuitje Vlieland", to: "/meerdaags-bedrijfsuitje-vlieland" },
    LOGIES_LINK,
  ],
};
