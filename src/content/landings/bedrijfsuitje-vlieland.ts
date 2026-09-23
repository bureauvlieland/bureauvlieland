import { Calendar, CheckCircle, MapPin, Ship, Users, Utensils } from "lucide-react";
import heroImage from "@/assets/team-beach.jpg";
import { ISLAND_FACTS, LOGIES_LINK } from "./shared";
import type { LandingContent } from "./types";

const description =
  "Een bedrijfsuitje op het Waddeneiland Vlieland, van 8 tot 200 personen: activiteiten, catering, overtocht en overnachting in één programma, geregeld door een bureau op het eiland zelf.";

export const bedrijfsuitjeVlieland: LandingContent = {
  slug: "bedrijfsuitje-vlieland",
  path: "/bedrijfsuitje-vlieland",
  breadcrumb: "Bedrijfsuitje Vlieland",
  seo: { title: "Bedrijfsuitje op Vlieland | Programma, boot en logies geregeld", description },
  service: { name: "Bedrijfsuitje op Vlieland", description },
  hero: {
    image: heroImage,
    alt: "Team op het strand van Vlieland tijdens een bedrijfsuitje",
    eyebrow: "Bedrijfsuitje",
    title: "Bedrijfsuitje op Vlieland",
    intro:
      "Geen standaard dagje uit, maar samen loskomen van de dagelijkse dynamiek, op een eiland waar rust, ruimte en aandacht vanzelf ontstaan.",
  },
  intro: {
    title: "Waarom een bedrijfsuitje op Vlieland?",
    paragraphs: [
      "Bureau Vlieland organiseert bedrijfsuitjes die verder gaan dan een losse activiteit: inhoudelijk sterk, logistiek kloppend en volledig afgestemd op uw organisatie.",
      "Vlieland is overzichtelijk, autoluw en ongedwongen. Juist daardoor ontstaat ruimte voor echte aandacht. Geen afleiding, geen haast, maar tijd voor samenwerking, reflectie en ontspanning. Of het nu gaat om een eendaags programma of een [meerdaags bedrijfsuitje met overnachting](/meerdaags-bedrijfsuitje-vlieland): het eiland dwingt tot vertraging, en dat werkt.",
    ],
  },
  facts: ISLAND_FACTS,
  sections: [
    {
      kind: "prose",
      title: "Wat voor bedrijfsuitjes organiseren wij?",
      paragraphs: [
        "Bureau Vlieland organiseert bedrijfsuitjes voor teams en organisaties die meer zoeken dan alleen vermaak. Denk aan een [personeelsuitje voor de hele organisatie](/personeelsuitje-vlieland), [teambuilding gericht op samenwerking](/teamuitje-vlieland), een [heisessie voor focus en strategie](/heisessie-vlieland) of een [zakelijk evenement](/zakelijk-evenement-vlieland) op unieke locaties.",
      ],
      checklist: [
        "Personeelsuitjes voor de hele organisatie, tot 150 collega's",
        "Teambuilding met inhoud en begeleiding",
        "Meerdaagse bedrijfsuitjes met overnachting",
        "Heisessies en strategiesessies",
        "Actieve programma's gecombineerd met rustmomenten",
        "Zakelijke evenementen op unieke locaties",
      ],
      closing:
        "Altijd op maat, altijd in samenhang. Op zoek naar inspiratie? Bekijk onze [ideeën voor een bedrijfsuitje op Vlieland](/bedrijfsuitje-ideeen-vlieland).",
    },
    {
      kind: "features",
      title: "Van idee tot uitvoering: alles geregeld",
      intro:
        "Wij zijn geen aanbieder van losse activiteiten, maar de regisseur van het totale programma. Wij verzorgen het volledige traject.",
      columns: 3,
      items: [
        { icon: Ship, title: "Vervoer van en naar het eiland" },
        { icon: MapPin, title: "Overnachtingen" },
        { icon: Calendar, title: "Programma-opbouw" },
        { icon: Users, title: "Activiteiten" },
        { icon: Utensils, title: "Catering" },
        { icon: CheckCircle, title: "Planning en begeleiding ter plaatse" },
      ],
      closing: "Eén aanspreekpunt, korte lijnen, lokaal georganiseerd.",
    },
    {
      kind: "prose",
      title: "Waarom Bureau Vlieland?",
      paragraphs: [
        "Bureau Vlieland is gevestigd op Vlieland en werkt al jaren samen met lokale partners. Wij kennen het eiland, de locaties en de logistiek. Daardoor kunnen wij snel schakelen, realistisch plannen en programma's bouwen die daadwerkelijk uitvoerbaar zijn.",
      ],
      closing: "Geen standaard pakketten, geen verkooppraatjes, maar ervaring en overzicht.",
    },
  ],
  templates: {
    title: "Voorbeelden van bedrijfsuitjes",
    intro: "Echte programma's van eerdere groepen, om van te starten of ideeën op te doen.",
  },
  quote: {
    text: "Vanaf het moment dat wij op onze boot zaten, klaar om richting Vlieland te varen, was daar het moment aangebroken om alles los te laten, want deze jongens hadden het allemaal onder controle! Alles liep perfect: geweldige hotels, activiteiten en feestavond.",
    author: "Ilona Norbart",
    company: "Districon Group",
  },
  faq: [
    {
      question: "Wat kost een bedrijfsuitje op Vlieland?",
      answer:
        "De prijs hangt af van groepsgrootte, programma en overnachting. Een dagprogramma start vanaf ongeveer € 95 per persoon (excl. overtocht); een meerdaags bedrijfsuitje met overnachting en catering ligt hoger. U ontvangt altijd een transparante offerte op maat.",
    },
    {
      question: "Hoeveel tijd moeten wij rekenen voor een bedrijfsuitje op Vlieland?",
      answer:
        "Reken minimaal één volle dag; de overtocht vanaf Harlingen duurt 90 minuten. Voor inhoudelijke programma's adviseren wij twee dagen met een overnachting, zodat er ruimte is voor zowel activiteit als reflectie.",
    },
    {
      question: "Kunnen wij met de auto naar Vlieland voor een bedrijfsuitje?",
      answer:
        "Nee, Vlieland is autoluw: auto's blijven op het vasteland (parkeerterrein Harlingen). Op het eiland verplaatst u zich met de fiets, te voet of met groepsvervoer dat wij voor u regelen.",
    },
    {
      question: "Welke activiteiten zijn mogelijk voor een bedrijfsuitje op Vlieland?",
      answer:
        "Onder andere wadexcursies, blokarten, powerkiten, paardrijden, zeilen, kookworkshops en strandactiviteiten. Bureau Vlieland combineert deze tot een samenhangend programma dat past bij het doel van uw uitje.",
    },
  ],
  also: [
    { label: "Personeelsuitje Vlieland", to: "/personeelsuitje-vlieland" },
    { label: "Teambuilding Vlieland", to: "/teamuitje-vlieland" },
    { label: "Meerdaags bedrijfsuitje Vlieland", to: "/meerdaags-bedrijfsuitje-vlieland" },
    { label: "Heisessie Vlieland", to: "/heisessie-vlieland" },
    { label: "Zakelijk evenement Vlieland", to: "/zakelijk-evenement-vlieland" },
    { label: "Bedrijfsuitje ideeën Vlieland", to: "/bedrijfsuitje-ideeen-vlieland" },
    LOGIES_LINK,
  ],
};
