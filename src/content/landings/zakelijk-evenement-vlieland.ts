import { Building2, Mic, Users } from "lucide-react";
import heroImage from "@/assets/event-outdoor.jpg";
import tentSetupImage from "@/assets/tent-setup.jpg";
import outdoorDiningImage from "@/assets/outdoor-dining.jpg";
import eventNightImage from "@/assets/event-night.jpg";
import { ISLAND_FACTS, LOGIES_LINK } from "./shared";
import type { LandingContent } from "./types";

const description =
  "Een congres, kick-off, klantendag of bedrijfsfeest op Vlieland. Bureau Vlieland regelt locatie, techniek, catering, logies en programma vanaf het eiland.";

export const zakelijkEvenementVlieland: LandingContent = {
  slug: "zakelijk-evenement-vlieland",
  path: "/zakelijk-evenement-vlieland",
  breadcrumb: "Zakelijk evenement Vlieland",
  parent: { label: "Bedrijfsuitje Vlieland", to: "/bedrijfsuitje-vlieland" },
  seo: { title: "Zakelijk evenement of congres op Vlieland | Organisatie van A tot Z", description },
  service: { name: "Zakelijk evenement op Vlieland", description },
  hero: {
    image: heroImage,
    alt: "Zakelijk evenement op Vlieland",
    eyebrow: "Zakelijk evenement",
    title: "Zakelijk evenement op Vlieland",
    intro: "Voor congressen, bijeenkomsten en zakelijke evenementen biedt Vlieland een unieke setting. Wij nemen de volledige organisatie uit handen.",
  },
  intro: {
    title: "Weg van de waan van de dag",
    paragraphs: [
      "Vlieland biedt rust, ruimte en focus: ideaal voor zakelijke bijeenkomsten die impact moeten maken. Volledig gericht op de inhoud, zonder de afleiding van kantoor.",
      "Bureau Vlieland is uitsluitend op dit eiland actief. Wij kennen elke locatie, leverancier en aanbieder persoonlijk, in plaats van te schakelen tussen meerdere Waddeneilanden.",
    ],
  },
  facts: ISLAND_FACTS,
  sections: [
    {
      kind: "features",
      title: "Waarom Vlieland voor uw evenement?",
      columns: 3,
      items: [
        { icon: Building2, title: "Professionele setting", text: "Vergaderlocaties met alle faciliteiten." },
        { icon: Mic, title: "Complete organisatie", text: "Van techniek tot catering geregeld." },
        { icon: Users, title: "Flexibele schaalgrootte", text: "Van 20 tot 200 deelnemers." },
      ],
    },
    {
      kind: "gallery",
      title: "Complete organisatie",
      intro: "Van locatie tot logistiek, van catering tot programma: wij verzorgen het complete traject.",
      images: [
        { src: tentSetupImage, alt: "Opbouw van een tent voor een evenement op Vlieland", title: "Locatie en materialen", text: "Tenten, meubilair, techniek en aankleding op maat." },
        { src: outdoorDiningImage, alt: "Zakelijk diner buiten op Vlieland", title: "Catering op niveau", text: "Van koffiepauze tot galadiner, passend bij uw evenement." },
        { src: eventNightImage, alt: "Avondevenement op Vlieland", title: "Netwerkprogramma", text: "Borrels, activiteiten en informele momenten tussendoor." },
      ],
    },
    {
      kind: "split",
      title: "Combineer met verdieping",
      paragraphs: [
        "Een zakelijk evenement op Vlieland wordt nog waardevoller met een inhoudelijke component of een overnachting. Zo wordt een klantendag een echte ontmoeting en een kick-off het begin van iets.",
      ],
      checklist: [
        "[Heisessie](/heisessie-vlieland) voor strategische focus",
        "[Incentive programma](/incentive-reis-vlieland) als beloning",
        "[Meerdaagse bijeenkomst](/meerdaags-bedrijfsuitje-vlieland) met overnachting",
      ],
      image: { src: heroImage, alt: "Zakelijk evenement buiten op Vlieland" },
    },
  ],
  templates: {
    title: "Voorbeeldprogramma's om van te starten",
    intro: "Programma's van eerdere groepen, als vertrekpunt voor uw eigen evenement.",
  },
  quote: {
    text: "Vanaf het moment dat wij op de boot zaten hadden deze jongens het allemaal onder controle. Alles liep perfect: geweldige hotels, activiteiten en feestavond.",
    author: "Ilona Norbart",
    company: "Districon Group",
  },
  faq: [
    {
      question: "Welke zakelijke evenementen organiseert Bureau Vlieland op Vlieland?",
      answer:
        "Kick-offs, klantendagen, productlanceringen, kleinere congressen, partnerdagen en jubilea. Voor teamwork zie onze pagina over een teamuitje op Vlieland; voor strategie de pagina over de heisessie.",
    },
    {
      question: "Voor hoeveel deelnemers kan een zakelijk evenement op Vlieland?",
      answer:
        "Comfortabel tot circa 150 deelnemers. Daarboven werken wij met meerdere locaties of een hotelovername. De capaciteit van de boot en van de logies op Vlieland bepalen de bovengrens; wij plannen daarop.",
    },
    {
      question: "Wat kost een zakelijk evenement op Vlieland?",
      answer:
        "Een eendaags zakelijk evenement start vanaf ongeveer € 150 per persoon (locatie, catering en basisprogramma, exclusief overtocht). Meerdaags met overnachting vanaf € 395 per persoon.",
    },
    {
      question: "Welke locaties zijn beschikbaar voor een congres of evenement?",
      answer:
        "Hotelvergaderzalen, strandpaviljoens, een filmtheater, eventhallen en in de zomer buitenlocaties in de duinen. Wij matchen de locatie aan het aantal deelnemers, de technische eisen en de gewenste sfeer.",
    },
  ],
  also: [
    { label: "Bedrijfsuitje Vlieland", to: "/bedrijfsuitje-vlieland" },
    { label: "Heisessie Vlieland", to: "/heisessie-vlieland" },
    { label: "Incentive Vlieland", to: "/incentive-reis-vlieland" },
    LOGIES_LINK,
  ],
};
