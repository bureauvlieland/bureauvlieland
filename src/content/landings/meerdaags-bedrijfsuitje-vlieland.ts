import { BedDouble, Coffee, Moon, Users } from "lucide-react";
import heroImage from "@/assets/vlieland-group.jpg";
import sunsetDinnerImage from "@/assets/sunset-dinner.jpg";
import beachBonfireImage from "@/assets/beach-bonfire.jpg";
import vlielandMorningImage from "@/assets/vlieland-morning.jpg";
import { ISLAND_FACTS, LOGIES_LINK } from "./shared";
import type { LandingContent } from "./types";

const description =
  "Een meerdaags bedrijfsuitje, teambuilding of heisessie op Vlieland met overnachting: programma, logies, catering en overtocht in één hand, geregeld vanaf het eiland.";

export const meerdaagsBedrijfsuitjeVlieland: LandingContent = {
  slug: "meerdaags-bedrijfsuitje-vlieland",
  path: "/meerdaags-bedrijfsuitje-vlieland",
  breadcrumb: "Meerdaags bedrijfsuitje Vlieland",
  parent: { label: "Bedrijfsuitje Vlieland", to: "/bedrijfsuitje-vlieland" },
  seo: { title: "Meerdaags bedrijfsuitje op Vlieland | Teambuilding of heisessie met overnachting", description },
  service: { name: "Meerdaags bedrijfsuitje op Vlieland", description },
  hero: {
    image: heroImage,
    alt: "Groep tijdens een meerdaags bedrijfsuitje op Vlieland",
    eyebrow: "Meerdaags",
    title: "Meerdaags bedrijfsuitje op Vlieland",
    intro:
      "Wie echt de diepte in wil, kiest voor een meerdaags programma. Door te blijven slapen ontstaat ruimte voor verdieping, ontspanning en onderlinge verbinding.",
  },
  intro: {
    title: "Minder haast, meer aandacht",
    paragraphs: [
      "Meerdaagse programma's zorgen voor minder haast en meer aandacht. Teams hebben de tijd om te landen, samen te werken en tot inzichten te komen.",
      "Wij zijn uitsluitend op Vlieland actief. Voor een meerdaags programma betekent dat één vast aanspreekpunt dat zelf hier woont, in plaats van schakelen tussen aanbieders op verschillende eilanden.",
    ],
  },
  facts: ISLAND_FACTS,
  sections: [
    {
      kind: "features",
      title: "Waarom meerdere dagen?",
      columns: 3,
      items: [
        { icon: Moon, title: "Meer tijd", text: "Ruimte voor verdieping en informele momenten." },
        { icon: Coffee, title: "Ontspanning", text: "Van vroege ochtend tot late avond." },
        { icon: Users, title: "Verbinding", text: "Teams groeien dichter naar elkaar toe." },
      ],
    },
    {
      kind: "gallery",
      title: "Van aankomst tot vertrek verzorgd",
      intro: "Wij regelen overnachtingen, programma's, activiteiten en catering. Alles op elkaar afgestemd.",
      images: [
        { src: sunsetDinnerImage, alt: "Diner bij zonsondergang", title: "Gezamenlijk diner", text: "Van borrel tot meergangenmenu: de avond als bindend moment." },
        { src: beachBonfireImage, alt: "Kampvuur op het strand", title: "Avondprogramma", text: "Strandvuur, silent disco of sterren kijken: informele verbinding." },
        { src: vlielandMorningImage, alt: "Ochtend op Vlieland", title: "Ontbijt en ochtend", text: "Rustig starten, fris de dag in, of vroeg actief op het strand." },
      ],
      aside: {
        icon: BedDouble,
        title: "Logies op maat",
        text: "Van hotels tot groepsaccommodaties: wij vinden de passende overnachting voor uw team.",
        link: { label: "Bekijk logiesopties", to: "/logies-vlieland" },
      },
    },
    {
      kind: "split",
      title: "Geschikt voor",
      paragraphs: [
        "Directies, managementteams, afdelingen en organisaties die willen investeren in samenwerking en focus. Zie ook de [heisessie](/heisessie-vlieland) en de [incentive reis](/incentive-reis-vlieland).",
      ],
      checklist: ["Heisessies en strategiedagen", "Teambuilding met verdieping", "Incentive reizen", "Afdelingsuitjes met overnachting"],
      image: { src: heroImage, alt: "Team op Vlieland" },
    },
  ],
  templates: {
    title: "Voorbeelden van meerdaagse programma's",
    intro: "Twee- en driedaagse programma's van eerdere groepen, om van te starten of ideeën op te doen.",
    minDays: 2,
  },
  quote: {
    text: "Vanaf de allereerste bespreking om invulling te geven aan een culinair, sportief en avontuurlijk weekend op Vlieland, tot en met het afscheid bij de terminal twee dagen later in Harlingen, heeft het team van Bureau Vlieland dit weekend tot in detail onvergetelijk gemaakt voor iedereen.",
    author: "Peter-Paul van de Kar",
    company: "Tradekar International BV",
  },
  faq: [
    {
      question: "Hoeveel dagen duurt een meerdaags bedrijfsuitje op Vlieland?",
      answer:
        "De meeste meerdaagse bedrijfsuitjes zijn twee dagen met één overnachting. Voor diepere teambuilding of een combinatie met een heisessie adviseren wij drie dagen met twee overnachtingen.",
    },
    {
      question: "Wat kost een meerdaags bedrijfsuitje op Vlieland?",
      answer:
        "Vanaf ongeveer € 295 per persoon voor twee dagen inclusief logies, ontbijt, één activiteit en een groepsdiner. De exacte prijs hangt af van logiestype en programma; u ontvangt een offerte op maat.",
    },
    {
      question: "Welke logies zijn geschikt voor een meerdaags bedrijfsuitje?",
      answer:
        "Hotels in dorp Oost-Vlieland, een groepsaccommodatie aan de duinrand of een hotel met blokboeking. Wij kiezen op basis van groepsgrootte, gewenste sfeer en budget.",
    },
    {
      question: "Wat is er 's avonds te doen tijdens een meerdaags bedrijfsuitje op Vlieland?",
      answer:
        "Een groepsdiner op een bijzondere locatie, een avondwandeling door de duinen, sterren kijken op het strand of een borrel in een lokaal café. Geen verplichte invulling; wij doen suggesties.",
    },
  ],
  also: [
    { label: "Bedrijfsuitje Vlieland", to: "/bedrijfsuitje-vlieland" },
    { label: "Heisessie Vlieland", to: "/heisessie-vlieland" },
    { label: "Incentive Vlieland", to: "/incentive-reis-vlieland" },
    LOGIES_LINK,
  ],
};
