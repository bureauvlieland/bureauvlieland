import { Award, BedDouble, Sparkles, Star } from "lucide-react";
import heroImage from "@/assets/speedboat-group.jpg";
import speedboatImage from "@/assets/speedboat.jpg";
import sunsetDinnerImage from "@/assets/sunset-dinner.jpg";
import outdoorDrinksImage from "@/assets/outdoor-drinks.jpg";
import { ISLAND_FACTS, LOGIES_LINK } from "./shared";
import type { LandingContent } from "./types";

const description =
  "Een incentive reis op Vlieland: exclusief, overzichtelijk en volledig verzorgd. Bureau Vlieland regelt boot, logies, catering en bijzondere activiteiten.";

export const incentiveReisVlieland: LandingContent = {
  slug: "incentive-reis-vlieland",
  path: "/incentive-reis-vlieland",
  breadcrumb: "Incentive reis Vlieland",
  parent: { label: "Bedrijfsuitje Vlieland", to: "/bedrijfsuitje-vlieland" },
  seo: { title: "Incentive reis op Vlieland – exclusief en verzorgd", description },
  service: { name: "Incentive reis op Vlieland", description },
  hero: {
    image: heroImage,
    alt: "Exclusieve incentive reis op Vlieland",
    eyebrow: "Incentive reis",
    title: "Incentive reis op Vlieland",
    intro: "Een bijzondere manier om waardering te tonen. Exclusief, overzichtelijk en volledig verzorgd.",
  },
  intro: {
    title: "Een beloning die een herinnering wordt",
    paragraphs: [
      "Het eilandgevoel maakt de ervaring uniek. Alles draait om samenzijn, beleving en kwaliteit. Een incentive reis naar Vlieland is meer dan een beloning: het is een herinnering die blijft.",
      "Wij zijn uitsluitend op Vlieland actief en kennen de meest bijzondere plekken en aanbieders van het eiland persoonlijk. Dat merkt u terug in de kwaliteit van het programma.",
    ],
  },
  facts: ISLAND_FACTS,
  sections: [
    {
      kind: "features",
      title: "Waarom een incentive op een eiland?",
      columns: 3,
      items: [
        { icon: Award, title: "Exclusieve beleving", text: "Een beloning die echt indruk maakt." },
        { icon: Star, title: "Volledig verzorgd", text: "Van boot tot borrel, alles geregeld." },
        { icon: Sparkles, title: "Unieke locatie", text: "Het eilandgevoel als toegevoegde waarde." },
      ],
    },
    {
      kind: "gallery",
      title: "Exclusief programma op maat",
      intro: "Of het nu gaat om een beloning voor topperformers of een motiverend event voor het hele team: wij zorgen voor een passend programma.",
      images: [
        { src: speedboatImage, alt: "Speedboottocht op Vlieland", title: "Unieke ervaringen", text: "Speedboottocht, privé rondvaart of exclusieve excursie." },
        { src: sunsetDinnerImage, alt: "Diner bij zonsondergang", title: "Culinaire hoogtepunten", text: "Diner bij zonsondergang of walking dinner op het strand." },
        { src: outdoorDrinksImage, alt: "Borrel op Vlieland", title: "Bijzondere locaties", text: "Van strandpaviljoen tot privésetting in de duinen." },
      ],
      aside: {
        icon: BedDouble,
        title: "Maak er een meerdaags verblijf van",
        text: "Een incentive reis combineren met een overnachting versterkt de impact: meer tijd voor beleving, ontspanning en onderlinge verbinding.",
        link: { label: "Bekijk meerdaagse opties", to: "/meerdaags-bedrijfsuitje-vlieland" },
      },
    },
    {
      kind: "split",
      title: "Voor klanten, topperformers of het hele team",
      paragraphs: [
        "Een incentive reis is een beloningsreis voor wie het verschil maakt. De meeste incentives op Vlieland duren twee of drie dagen: een aankomstdiner, een vol dagprogramma met exclusieve activiteiten en een ontspannen vertrek na een laatste ochtend op het eiland.",
      ],
      checklist: [
        "Privé zeiltocht of speedboottocht rond het eiland",
        "Diner op het strand bij zonsondergang",
        "Vuurtorenbeklimming buiten openingstijden",
        "Wadexcursie met een eigen gids",
        "Privécharter als alternatief voor de veerdienst",
      ],
      image: { src: heroImage, alt: "Groep op incentive reis op Vlieland" },
    },
  ],
  templates: {
    title: "Voorbeeldprogramma's om van te starten",
    intro: "Programma's van eerdere groepen, als vertrekpunt voor uw eigen incentive.",
  },
  quote: {
    text: "Snelle ribs, parachutespringen op de Vliehors en picknicken tussen de tanks. Waar kan dat nou anders dan bij ons op de Wadden? Ja, zelfs de Chablis en de oesters waren uitstekend.",
    author: "Jort Kelder",
    company: "Journalist en presentator",
  },
  faq: [
    {
      question: "Wat is een incentive reis en wat kost dat op Vlieland?",
      answer:
        "Een incentive reis is een exclusieve beloningsreis voor klanten of medewerkers. Op Vlieland start een tweedaagse incentive vanaf ongeveer € 595 per persoon inclusief premium logies, catering en exclusieve activiteiten.",
    },
    {
      question: "Hoeveel dagen duurt een incentive reis op Vlieland?",
      answer:
        "De meeste incentives duren 2 of 3 dagen. Dat geeft ruimte voor een aankomstdiner, een vol dagprogramma met exclusieve activiteiten en een ontspannen vertrek na een laatste ochtend op het eiland.",
    },
    {
      question: "Welke exclusieve activiteiten zijn mogelijk?",
      answer:
        "Privé zeiltochten, een diner op het strand bij zonsondergang, vuurtorenbeklimming buiten openingstijden, exclusieve wadexcursies met een persoonlijke gids en chef's table diners op bijzondere locaties.",
    },
    {
      question: "Regelt Bureau Vlieland ook een privé-overtocht of charter?",
      answer:
        "Ja. Voor selecte groepen organiseren wij een privécharter (zeilcharter of motorboot) als alternatief voor de reguliere veerdienst van Doeksen. Dit voegt exclusiviteit toe aan het programma.",
    },
  ],
  also: [
    { label: "Meerdaags bedrijfsuitje Vlieland", to: "/meerdaags-bedrijfsuitje-vlieland" },
    { label: "Zakelijk evenement Vlieland", to: "/zakelijk-evenement-vlieland" },
    { label: "Bedrijfsuitje Vlieland", to: "/bedrijfsuitje-vlieland" },
    LOGIES_LINK,
  ],
};
