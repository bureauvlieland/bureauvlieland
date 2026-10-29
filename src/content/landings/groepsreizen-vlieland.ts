import { Bike, Briefcase, CalendarCheck, Heart, Receipt, Ship, Users, Utensils } from "lucide-react";
import heroImage from "@/assets/rmd-beach-group.jpg";
import ferryImage from "@/assets/ferry-doeksen.webp";
import cyclingGroupImage from "@/assets/cycling-group.jpg";
import sunsetDinnerImage from "@/assets/sunset-dinner.jpg";
import { ISLAND_FACTS, LOGIES_LINK } from "./shared";
import type { LandingContent } from "./types";

/**
 * Overzichtspagina voor "met een groep naar Vlieland". Dit is ook het adres
 * waar visitvlieland.nl op elke pagina naartoe linkt ("Met je groep of
 * bedrijf naar Vlieland"); tot 28 oktober 2026 kwam die link op de 404 uit.
 * De pagina verdeelt bezoekers over de specifieke pagina's per gelegenheid.
 */
const description =
  "Met een groep naar Vlieland? Bureau Vlieland regelt de groepsreis van boot tot borrel: overtocht, fietsen, logies, activiteiten en eten in één programma en op één factuur. Voor bedrijven, verenigingen, families en vriendengroepen.";

export const groepsreizenVlieland: LandingContent = {
  slug: "groepsreizen-vlieland",
  path: "/groepsreizen-vlieland",
  breadcrumb: "Groepsreis Vlieland",
  parent: { label: "Voor wie", to: "/voor-wie" },
  seo: { title: "Groepsreis naar Vlieland | Met een groep naar het eiland, alles geregeld", description, image: "/og/groepsreizen-vlieland.jpg" },
  service: { name: "Groepsreis naar Vlieland", description },
  hero: {
    image: heroImage,
    alt: "Groep op het strand van Vlieland tijdens een groepsreis",
    eyebrow: "Groepsreis",
    title: "Met een groep naar Vlieland",
    intro:
      "Bedrijf, vereniging, familie of vriendengroep: wij wonen op het eiland en regelen de hele reis, van de boot in Harlingen tot de borrel op het strand.",
  },
  intro: {
    title: "Eén aanspreekpunt voor de hele groep",
    paragraphs: [
      "Een groepsreis naar Vlieland vraagt om afstemming: de overtocht op één reservering, fietsen klaar bij de boot, een logies dat de hele groep past, activiteiten op de juiste tijd van het getij en een tafel die groot genoeg is. Bureau Vlieland regelt dat als één partij, met één factuur.",
      "Wij zijn uitsluitend op Vlieland actief en werken al jaren met dezelfde gidsen, koks, schippers en hoteliers. U hoeft niemand op het eiland zelf te bellen: wij kennen ze, en zij kennen ons.",
    ],
  },
  facts: ISLAND_FACTS,
  sections: [
    {
      kind: "prose",
      title: "Welke groepsreis past bij u?",
      paragraphs: [
        "Elke groep is anders, en daarom heeft elke gelegenheid bij ons een eigen pagina met voorbeelden, prijzen en veelgestelde vragen. Kiest u voor een [bedrijfsuitje](/bedrijfsuitje-vlieland), een [personeelsuitje voor de hele organisatie](/personeelsuitje-vlieland) of [teambuilding](/teamuitje-vlieland)? Of komt u met de [vereniging of vriendengroep een weekend](/groepsweekend-vlieland), met de [familie](/familieweekend-vlieland) of om een [jubileum te vieren](/jubileum-vlieland)?",
      ],
      checklist: [
        "Bedrijven en teams: bedrijfsuitje, teambuilding, heisessie, incentive of zakelijk evenement",
        "Verenigingen, sportclubs en vriendengroepen: een groepsweekend op maat",
        "Families: een familieweekend of jubileum met kinderen en grootouders",
        "Scholen en studieverenigingen: een eilanddag of kamp met programma en begeleiding",
      ],
      closing:
        "Weet u nog niet wat past? [Vertel ons wat u zoekt](/programma-op-maat), dan denken wij mee. Binnen vijf werkdagen ontvangt u een vrijblijvend voorstel.",
    },
    {
      kind: "features",
      title: "Wat wij voor uw groep regelen",
      intro: "Geen losse boekingen bij zes verschillende partijen, maar één programma dat klopt.",
      columns: 3,
      items: [
        { icon: Ship, title: "De overtocht", text: "Veerboot of sneldienst vanuit Harlingen, voor de hele groep op één reservering, tickets centraal toegestuurd." },
        { icon: Bike, title: "Fietsen en vervoer", text: "Fietsen staan klaar bij de boot; voor bagage en wie minder goed ter been is regelen wij groepsvervoer." },
        { icon: Users, title: "Activiteiten", text: "Zeehondentocht, wadexcursie, Vliehors Expres, strandspellen of een workshop: afgestemd op groep en getij." },
        { icon: Utensils, title: "Eten en drinken", text: "Lunch onderweg, BBQ op locatie, diner in een restaurant of borrel bij zonsondergang." },
        { icon: CalendarCheck, title: "Logies", text: "Hotel, groepsaccommodatie, appartementen of een combinatie, passend bij groepsgrootte en budget." },
        { icon: Receipt, title: "Eén factuur", text: "Alle onderdelen op één overzicht en één factuur, met de btw per onderdeel uitgesplitst." },
      ],
    },
    {
      kind: "gallery",
      title: "Zo ziet een groepsreis eruit",
      intro: "Een paar vaste ingrediënten, in elke gewenste volgorde en omvang.",
      images: [
        { src: ferryImage, alt: "Veerboot van Rederij Doeksen op weg naar Vlieland", title: "De overtocht als begin", text: "Negentig minuten varen, of 45 met de sneldienst. De reis is al onderdeel van het programma." },
        { src: cyclingGroupImage, alt: "Groep fietst over Vlieland", title: "Het eiland per fiets", text: "Autoluw, overzichtelijk en overal binnen een halfuur fietsen. Ook met e-bikes en tandems." },
        { src: sunsetDinnerImage, alt: "Diner bij zonsondergang op Vlieland", title: "Samen aan tafel", text: "Van strandpaviljoen tot restaurant in het dorp: wij reserveren voor de hele groep." },
      ],
      aside: {
        icon: Heart,
        title: "Individueel of met een klein gezelschap?",
        text: "Voor losse activiteiten, hotels en restaurants hoeft u geen programma aan te vragen: activiteiten boekt u direct, en de rest vindt u bij onze eilandpartners.",
        link: { label: "Bekijk alle activiteiten", to: "/activiteiten-vlieland" },
      },
    },
    {
      kind: "split",
      title: "Zelf samenstellen of laten regelen?",
      paragraphs: [
        "Voor een dagprogramma met boot, fietsen en een paar activiteiten stelt u online zelf een programma samen, met prijzen in beeld en zonder offerte-aanvraag. Voor een meerdaagse reis, een grote groep of bijzondere wensen vertelt u ons wat u zoekt en maken wij een voorstel op maat.",
      ],
      checklist: ["Online samenstellen: direct prijzen, zelf kiezen", "Op maat: meerdaags, logies, grote groepen", "In beide gevallen: één aanspreekpunt en één factuur"],
      image: { src: heroImage, alt: "Groep op het strand van Vlieland" },
      imagePosition: "left",
      cta: { label: "Stel uw programma samen", to: "/programma-samenstellen" },
      secondary: { label: "Start een aanvraag op maat", to: "/programma-op-maat" },
    },
  ],
  templates: {
    title: "Voorbeeldprogramma's voor groepen",
    intro: "Programma's van eerdere groepen, als vertrekpunt voor uw eigen reis.",
  },
  faq: [
    {
      question: "Vanaf hoeveel personen organiseert Bureau Vlieland een groepsreis?",
      answer:
        "Een volledig verzorgd programma maken wij vanaf ongeveer 20 personen, tot groepen van 200. Kleinere gezelschappen stellen online zelf een [dagprogramma samen](/programma-samenstellen) of boeken [losse activiteiten](/activiteiten-boeken) direct.",
    },
    {
      question: "Wat kost een groepsreis naar Vlieland?",
      answer:
        "Een dagprogramma start vanaf ongeveer € 95 per persoon, exclusief overtocht. Een weekend met twee overnachtingen en een basisprogramma begint rond € 175 tot € 195 per persoon, afhankelijk van het logiestype. U ontvangt een offerte waarin elk onderdeel apart staat.",
    },
    {
      question: "Hoe komt de groep op Vlieland en kunnen wij de auto meenemen?",
      answer:
        "Vlieland is autoluw: auto's van bezoekers mogen niet mee. U parkeert in Harlingen en vaart met de veerboot van Rederij Doeksen (circa 90 minuten) of de sneldienst (circa 45 minuten). Wij boeken de overtocht voor de hele groep op één reservering; op het eiland staan de fietsen klaar.",
    },
    {
      question: "Hoe ver van tevoren moeten wij een groepsreis boeken?",
      answer:
        "Voor een weekend in het voor- of naseizoen is twee tot drie maanden meestal voldoende. Voor de zomer, een groep boven de 50 personen of een logies met de hele groep onder één dak adviseren wij vier tot zes maanden vooruit, omdat de capaciteit op het eiland beperkt is.",
    },
    {
      question: "Wat als het slecht weer is?",
      answer:
        "Vlieland heeft voor elk weertype een programma: bij storm wisselen wij een wadexcursie om voor een workshop, museumbezoek of de Kaasbunker, en een zeehondentocht wordt verzet in overleg met de schipper. Dat regelen wij, u hoeft zelf niemand te bellen.",
    },
    {
      question: "Komt u via Visit Vlieland?",
      answer:
        "Visit Vlieland is onze zustersite voor individuele bezoekers, met hotels, restaurants en activiteiten op het eiland. Voor groepen vanaf ongeveer 20 personen verwijst die site naar deze pagina: hier regelt Bureau Vlieland het complete programma.",
    },
  ],
  also: [
    { label: "Bedrijfsuitje Vlieland", to: "/bedrijfsuitje-vlieland" },
    { label: "Groepsweekend Vlieland", to: "/groepsweekend-vlieland" },
    { label: "Familieweekend Vlieland", to: "/familieweekend-vlieland" },
    { label: "Activiteiten op Vlieland", to: "/activiteiten-vlieland" },
    LOGIES_LINK,
  ],
};
