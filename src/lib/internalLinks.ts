/**
 * Centrale interne linkstructuur.
 *
 * Doel: elke publieke pagina verwijst door naar 3-6 pagina's die passen bij
 * dezelfde zoekintentie, zodat crawlers alle pagina's snel bereiken en
 * bezoekers logisch doorklikken.
 */

export interface InternalLink {
  href: string;
  label: string;
  description: string;
}

const L = {
  bouwstenen: {
    href: "/bouwstenen",
    label: "Alle activiteiten",
    description: "Bekijk alle bouwstenen die u kunt combineren",
  },
  activiteitenVlieland: {
    href: "/activiteiten-vlieland",
    label: "Activiteiten op Vlieland",
    description: "Wat kunt u doen op het eiland, per seizoen",
  },
  zeehonden: {
    href: "/zeehondentochten-vlieland",
    label: "Zeehondentochten",
    description: "Duur, prijs en beste tijd om zeehonden te spotten",
  },
  wadlopen: {
    href: "/wadlopen-vlieland",
    label: "Wadlopen",
    description: "Wadlopen op en rond Vlieland met gids",
  },
  logies: {
    href: "/logies-vlieland",
    label: "Overnachten op Vlieland",
    description: "Hotels, groepsaccommodaties en kamperen",
  },
  catering: {
    href: "/catering",
    label: "Catering",
    description: "Van lunch tot shared dining op locatie",
  },
  cateringAanvragen: {
    href: "/catering-aanvragen",
    label: "Catering aanvragen",
    description: "Vraag direct een cateringvoorstel aan",
  },
  evenementen: {
    href: "/evenementen",
    label: "Evenementen",
    description: "Zakelijke evenementen en bijzondere gelegenheden",
  },
  voorbeeldprogrammas: {
    href: "/voorbeeldprogrammas",
    label: "Voorbeeldprogramma's",
    description: "Kant-en-klare dagindelingen van eerdere groepen",
  },
  samenstellen: {
    href: "/programma-samenstellen",
    label: "Stel uw programma samen",
    description: "Bouw zelf een programma in een paar stappen",
  },
  opMaat: {
    href: "/programma-op-maat",
    label: "Programma op maat",
    description: "Wij werken een voorstel voor u uit",
  },
  losseActiviteiten: {
    href: "/activiteiten-boeken",
    label: "Losse activiteiten boeken",
    description: "Direct één activiteit reserveren",
  },
  snelAanvragen: {
    href: "/snel-aanvragen",
    label: "Snel aanvragen",
    description: "In één minuut uw wensen doorgeven",
  },
  werkwijze: {
    href: "/onze-werkwijze",
    label: "Onze werkwijze",
    description: "Van aanvraag tot één factuur achteraf",
  },
  faq: {
    href: "/veelgestelde-vragen",
    label: "Veelgestelde vragen",
    description: "Prijzen, offertes, vervoer en groepsgroottes",
  },
  offerte: {
    href: "/offerte",
    label: "Offerte aanvragen",
    description: "Vrijblijvend voorstel binnen twee werkdagen",
  },
  contact: {
    href: "/contact",
    label: "Contact",
    description: "Stel uw vraag aan het bureau op het eiland",
  },
  overOns: {
    href: "/over-ons",
    label: "Over Bureau Vlieland",
    description: "Lokale specialist, één aanspreekpunt",
  },
  partners: {
    href: "/partners",
    label: "Aangesloten partners",
    description: "De ondernemers waarmee wij samenwerken",
  },
  bedrijfsuitje: {
    href: "/bedrijfsuitje-vlieland",
    label: "Bedrijfsuitje Vlieland",
    description: "Compleet verzorgd uitje voor uw team",
  },
  meerdaags: {
    href: "/meerdaags-bedrijfsuitje-vlieland",
    label: "Meerdaags bedrijfsuitje",
    description: "Twee of meer dagen inclusief overnachting",
  },
  teamuitje: {
    href: "/teamuitje-vlieland",
    label: "Teambuilding",
    description: "Teamuitjes met samenwerking als rode draad",
  },
  heisessie: {
    href: "/heisessie-vlieland",
    label: "Heisessie",
    description: "Vergaderen met ruimte om echt door te denken",
  },
  zakelijk: {
    href: "/zakelijk-evenement-vlieland",
    label: "Zakelijk evenement",
    description: "Van relatiedag tot personeelsfeest",
  },
  incentive: {
    href: "/incentive-reis-vlieland",
    label: "Incentive reis",
    description: "Belonen met een onvergetelijke eilandtrip",
  },
  ideeen: {
    href: "/bedrijfsuitje-ideeen-vlieland",
    label: "Bedrijfsuitje ideeën",
    description: "Inspiratie voor uw volgende uitje",
  },
  groepsweekend: {
    href: "/groepsweekend-vlieland",
    label: "Groepsweekend",
    description: "Een weekend weg met vrienden of vereniging",
  },
  jubileum: {
    href: "/jubileum-vlieland",
    label: "Jubileum vieren",
    description: "Een mijlpaal vieren op het eiland",
  },
  familieweekend: {
    href: "/familieweekend-vlieland",
    label: "Familieweekend",
    description: "Samen weg met de hele familie",
  },
  voorWie: {
    href: "/voor-wie",
    label: "Voor wie wij werken",
    description: "Bedrijven, verenigingen en families",
  },
} satisfies Record<string, InternalLink>;

type Cluster = { title?: string; links: InternalLink[] };

const CLUSTERS: Record<string, Cluster> = {
  "/bouwstenen": {
    title: "Verder kijken",
    links: [L.activiteitenVlieland, L.zeehonden, L.wadlopen, L.voorbeeldprogrammas, L.losseActiviteiten, L.catering],
  },
  "/activiteiten-vlieland": {
    title: "Populaire activiteiten en vervolgstappen",
    links: [L.zeehonden, L.wadlopen, L.bouwstenen, L.voorbeeldprogrammas, L.losseActiviteiten, L.logies],
  },
  "/zeehondentochten-vlieland": {
    title: "Combineer met",
    links: [L.wadlopen, L.activiteitenVlieland, L.bouwstenen, L.voorbeeldprogrammas, L.losseActiviteiten, L.logies],
  },
  "/wadlopen-vlieland": {
    title: "Combineer met",
    links: [L.zeehonden, L.activiteitenVlieland, L.bouwstenen, L.voorbeeldprogrammas, L.catering, L.logies],
  },
  "/voorbeeldprogrammas": {
    title: "Zelf verder bouwen",
    links: [L.samenstellen, L.opMaat, L.bouwstenen, L.logies, L.catering, L.werkwijze],
  },
  "/logies-vlieland": {
    title: "Maak het compleet",
    links: [L.bouwstenen, L.catering, L.voorbeeldprogrammas, L.meerdaags, L.groepsweekend, L.werkwijze],
  },
  "/catering": {
    title: "Maak het compleet",
    links: [L.cateringAanvragen, L.bouwstenen, L.logies, L.evenementen, L.voorbeeldprogrammas, L.faq],
  },
  "/catering-aanvragen": {
    title: "Ook interessant",
    links: [L.catering, L.bouwstenen, L.logies, L.evenementen, L.werkwijze, L.faq],
  },
  "/evenementen": {
    title: "Ook interessant",
    links: [L.zakelijk, L.jubileum, L.catering, L.logies, L.voorbeeldprogrammas, L.offerte],
  },
  "/onze-werkwijze": {
    title: "Zo begint u",
    links: [L.samenstellen, L.opMaat, L.snelAanvragen, L.voorbeeldprogrammas, L.faq, L.overOns],
  },
  "/over-ons": {
    title: "Verder lezen",
    links: [L.werkwijze, L.partners, L.voorWie, L.voorbeeldprogrammas, L.faq, L.contact],
  },
  "/partners": {
    title: "Verder lezen",
    links: [L.overOns, L.werkwijze, L.bouwstenen, L.logies, L.catering, L.contact],
  },
  "/contact": {
    title: "Misschien zoekt u dit",
    links: [L.faq, L.offerte, L.werkwijze, L.voorbeeldprogrammas, L.bouwstenen, L.overOns],
  },
  "/veelgestelde-vragen": {
    title: "Direct verder",
    links: [L.werkwijze, L.offerte, L.samenstellen, L.voorbeeldprogrammas, L.logies, L.contact],
  },
  "/offerte": {
    title: "Eerst oriënteren?",
    links: [L.voorbeeldprogrammas, L.bouwstenen, L.werkwijze, L.faq, L.logies, L.catering],
  },
  "/voor-wie": {
    title: "Populaire aanleidingen",
    links: [L.bedrijfsuitje, L.teamuitje, L.heisessie, L.groepsweekend, L.familieweekend, L.jubileum],
  },
  "/activiteiten-boeken": {
    title: "Liever een compleet programma?",
    links: [L.samenstellen, L.voorbeeldprogrammas, L.bouwstenen, L.activiteitenVlieland, L.logies, L.opMaat],
  },
  "/bedrijfsuitje-vlieland": {
    title: "Ook relevant voor bedrijven",
    links: [L.meerdaags, L.teamuitje, L.heisessie, L.zakelijk, L.incentive, L.ideeen],
  },
  "/meerdaags-bedrijfsuitje-vlieland": {
    title: "Ook relevant voor bedrijven",
    links: [L.bedrijfsuitje, L.logies, L.heisessie, L.teamuitje, L.voorbeeldprogrammas, L.catering],
  },
  "/teamuitje-vlieland": {
    title: "Ook relevant voor bedrijven",
    links: [L.bedrijfsuitje, L.ideeen, L.heisessie, L.meerdaags, L.bouwstenen, L.voorbeeldprogrammas],
  },
  "/heisessie-vlieland": {
    title: "Ook relevant voor bedrijven",
    links: [L.zakelijk, L.meerdaags, L.logies, L.catering, L.bedrijfsuitje, L.werkwijze],
  },
  "/zakelijk-evenement-vlieland": {
    title: "Ook relevant voor bedrijven",
    links: [L.evenementen, L.heisessie, L.incentive, L.catering, L.logies, L.offerte],
  },
  "/incentive-reis-vlieland": {
    title: "Ook relevant voor bedrijven",
    links: [L.bedrijfsuitje, L.meerdaags, L.zakelijk, L.voorbeeldprogrammas, L.logies, L.bouwstenen],
  },
  "/bedrijfsuitje-ideeen-vlieland": {
    title: "Van idee naar programma",
    links: [L.bouwstenen, L.voorbeeldprogrammas, L.bedrijfsuitje, L.teamuitje, L.samenstellen, L.activiteitenVlieland],
  },
  "/groepsweekend-vlieland": {
    title: "Ook interessant",
    links: [L.familieweekend, L.jubileum, L.logies, L.bouwstenen, L.voorbeeldprogrammas, L.catering],
  },
  "/jubileum-vlieland": {
    title: "Ook interessant",
    links: [L.evenementen, L.groepsweekend, L.catering, L.logies, L.bouwstenen, L.offerte],
  },
  "/familieweekend-vlieland": {
    title: "Ook interessant",
    links: [L.groepsweekend, L.activiteitenVlieland, L.zeehonden, L.logies, L.bouwstenen, L.voorbeeldprogrammas],
  },
};

const FALLBACK: Cluster = {
  title: "Verder op deze site",
  links: [L.bouwstenen, L.voorbeeldprogrammas, L.logies, L.catering, L.werkwijze, L.faq],
};

/** Related links voor een pad; filtert de huidige pagina er altijd uit. */
export function getRelatedLinks(pathname: string, limit = 6): Cluster {
  const cluster = CLUSTERS[pathname] ?? FALLBACK;
  return {
    title: cluster.title,
    links: cluster.links.filter((l) => l.href !== pathname).slice(0, limit),
  };
}

export const internalLinks = L;
