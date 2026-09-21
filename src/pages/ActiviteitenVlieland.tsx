/**
 * Activiteiten op Vlieland: redactioneel SEO-overzicht van wat er op het
 * eiland te doen is. Verschil met /bouwstenen (de catalogus): deze pagina is
 * een thematisch overzicht dat doorlinkt naar de juiste landingspagina of
 * bouwsteen. Doel-zoekwoorden: "vlieland activiteiten", "wat te doen op
 * vlieland", "uitjes vlieland". Op het ontwerpsysteem sinds fase 4 deel 2.
 */
import { Helmet } from "react-helmet";
import { Bike, CalendarDays, Clock, Flower2, Landmark, Leaf, Ship, Snowflake, Sun, Users, UtensilsCrossed, Waves, type LucideIcon } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { FaqSection } from "@/components/FaqSection";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { SeeAlsoActivities } from "@/components/SeeAlsoActivities";
import { ActivityFilter } from "@/components/ActivityFilter";
import { GoogleReviewsBlock } from "@/components/GoogleReviewsBlock";
import { BodySection, Paragraphs } from "@/components/landing/sections";
import { sectionCounter } from "@/components/landing/sectionCounter";
import { Container, FactList, LinkCard, PageHero, RouteChooser, Section, SectionHeader } from "@/components/system";
import { featuredActivities } from "@/content/activityLinks";
import type { LandingSection } from "@/content/landings/types";
import heroImage from "@/assets/beach-activity.jpg";

const URL = "https://bureauvlieland.nl/activiteiten-vlieland";
const EYEBROW = "Activiteiten op Vlieland";

type Thema = {
  icon: LucideIcon;
  title: string;
  intro: string;
  items: { label: string; to: string; description: string }[];
};

const themas: Thema[] = [
  {
    icon: Waves,
    title: "Wadden en natuur",
    intro: "Vlieland ligt midden in het UNESCO-Werelderfgoed Waddenzee. Het wad, de zandbanken en de duinen zijn dé reden om te komen.",
    items: [
      { label: "Wadexcursie", to: "/wadlopen-vlieland", description: "Met een lokale gids het wad op, voor alle leeftijden." },
      { label: "Zeehondentocht", to: "/zeehondentochten-vlieland", description: "Per boot naar de zandbanken om zeehonden te spotten." },
      { label: "Excursies Staatsbosbeheer", to: "/bouwstenen", description: "Strandjutten, vogels kijken, paddenstoelen, onder leiding van een boswachter." },
    ],
  },
  {
    icon: Bike,
    title: "Actief op het eiland",
    intro: "Vlieland is autoluw: fiets, voet en strand zijn koning. Van rustige fietstocht tot stevige strandsessie.",
    items: [
      { label: "Begeleide fietstocht", to: "/activiteit/fietstocht-met-begeleiding", description: "Ontdek de mooiste plekken met een lokale gids." },
      { label: "Blokarten op het strand", to: "/activiteit/blokarten", description: "Zeilen op wielen over het Vliehors-strand." },
      { label: "Vuurtoren beklimmen", to: "/activiteit/vuurtorenbezoek", description: "Honderden treden naar het hoogste punt van het eiland." },
    ],
  },
  {
    icon: Landmark,
    title: "Cultuur en historie",
    intro: "Eilandverhalen: van walvisvaarders tot Drenkelingenhuisje. Kleinschalig maar verrassend.",
    items: [
      { label: "Museum Tromp's Huys", to: "/bouwstenen", description: "Het oudste huis van Vlieland, vol eilandgeschiedenis." },
      { label: "Dorpsommetje Oost-Vlieland", to: "/bouwstenen", description: "Een wandeling langs de mooiste plekjes van het dorp." },
      { label: "Vuurboetsduin", to: "/bouwstenen", description: "Het hoogste duin, met uitzicht over het hele eiland." },
    ],
  },
  {
    icon: UtensilsCrossed,
    title: "Eten en drinken",
    intro: "Lunches met uitzicht, BBQ op locatie of een diner in het dorp: wij regelen het.",
    items: [
      { label: "Catering en lunches", to: "/catering", description: "Van borrelhap tot warm buffet, op locatie geleverd." },
      { label: "Restaurants en terrassen", to: "/bouwstenen", description: "Eilandadressen die wij zelf graag aanbevelen." },
      { label: "BBQ op locatie", to: "/catering-aanvragen?type=bbq", description: "Vergunning, koks en opbouw: wij regelen het volledig." },
    ],
  },
  {
    icon: Users,
    title: "Voor groepen",
    intro: "Bedrijfsuitje, teambuilding of familieweekend: wij stellen een compleet programma samen. Eén partij, één factuur.",
    items: [
      { label: "Bedrijfsuitje Vlieland", to: "/bedrijfsuitje-vlieland", description: "Compleet dag- of meerdaags programma voor teams." },
      { label: "Teambuilding", to: "/teamuitje-vlieland", description: "Activiteiten die uw team echt dichter bij elkaar brengen." },
      { label: "Familieweekend", to: "/familieweekend-vlieland", description: "Een weekend dat voor jong én oud werkt." },
      { label: "Voorbeeldprogramma's", to: "/voorbeeldprogrammas", description: "Concrete dagindelingen van eerdere groepen, om van te starten." },
    ],
  },
];

const dayPlan: LandingSection = {
  kind: "prose",
  title: "Een dag op Vlieland: hoe deelt u die in?",
  paragraphs: [
    "Een dagje Vlieland begint meestal met de boot van 9:00 of 10:30 vanuit Harlingen. Na aankomst pakt u een fiets bij de haven en bent u in tien minuten in het dorp. Een wadexcursie of fietstocht met gids vult de ochtend, u luncht in het dorp of op het strand, en 's middags staat een zeehondentocht, blokarten of een wandeling door de duinen op het programma. Begin van de avond gaat de boot terug, of u blijft slapen.",
    "Voor groepen plannen wij dit van A tot Z. Bekijk onze [voorbeeldprogramma's](/voorbeeldprogrammas) voor concrete dagindelingen, of [stel zelf een programma samen](/programma-samenstellen).",
  ],
};

const seasons: LandingSection = {
  kind: "features",
  title: "Activiteiten per seizoen",
  intro: "Elk seizoen heeft zijn eigen eiland. Voor groepen plannen wij het hele jaar door.",
  columns: 2,
  items: [
    { icon: Flower2, title: "Voorjaar (maart tot mei)", text: "Rustig op het eiland, volop vogeltrek. Wadexcursies, fietstochten en duinwandelingen zijn op hun mooist. Ideaal voor heisessies en teamdagen." },
    { icon: Sun, title: "Zomer (juni tot augustus)", text: "Alles draait: zeehondentochten, blokarten, strandactiviteiten en BBQ's op het strand. Reserveer ruim vooraf, want aanbieders zitten vol." },
    { icon: Leaf, title: "Najaar (september en oktober)", text: "Het beste van twee werelden: nog warm water, minder drukte en prachtig licht. De populairste periode voor bedrijfsuitjes." },
    { icon: Snowflake, title: "Winter (november tot februari)", text: "Stormachtig en stil. Vliehors Expres, museum, proeverijen en vergaderarrangementen met een stevige wandeling ertussen." },
  ],
};

const faq = [
  {
    question: "Wat zijn de leukste activiteiten op Vlieland?",
    answer: "Een wadexcursie en een zeehondentocht zijn klassiekers. Fietsen door de duinen, blokarten op de Vliehors en de vuurtoren beklimmen horen ook in elk programma thuis. Voor groepen combineren wij activiteiten tot een compleet dagprogramma.",
  },
  {
    question: "Wat kunt u doen op Vlieland bij slecht weer?",
    answer: "Museum Tromp's Huys, het Centrum voor Natuur en Landschap, een proeverij of een workshop binnen zijn goede alternatieven. Veel buitenactiviteiten, zoals een wadexcursie of fietstocht, gaan trouwens gewoon door bij regen; daar bent u op gekleed.",
  },
  {
    question: "Wat is er te doen met kinderen op Vlieland?",
    answer: "De Vliehors Expres, een wadexcursie, de vuurtoren beklimmen, strandzeilen en strandjutten zijn populair bij kinderen. Vlieland is autoluw, dus kinderen kunnen overal veilig fietsen.",
  },
  {
    question: "Wanneer is het beste seizoen voor activiteiten op Vlieland?",
    answer: "Mei tot oktober is hoogseizoen; alle aanbieders draaien dan vol. Buiten dat seizoen kan veel ook nog, maar het aanbod is beperkter. Voor groepen plannen wij het hele jaar door.",
  },
  {
    question: "Kunt u activiteiten op Vlieland vooraf reserveren?",
    answer: "Ja. Wadexcursies, zeehondentochten, fietstochten met gids en catering zijn allemaal te reserveren. Via Bureau Vlieland boekt u in één keer alles voor uw groep, inclusief de boot en eventueel een overnachting.",
  },
  {
    question: "Hoe komt u op Vlieland?",
    answer: "Met de boot van Rederij Doeksen vanuit Harlingen. Auto's mogen niet mee; Vlieland is autoluw. Reken voor de overtocht op ongeveer anderhalf uur met de gewone boot of 45 minuten met de snelboot.",
  },
];

const ActiviteitenVlieland = () => {
  const next = sectionCounter();
  const themesAt = next();
  const filterAt = next();
  const detailAt = next();
  const dayPlanAt = next();
  const seasonsAt = next();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Activiteiten Vlieland: wat te doen op het eiland | Bureau Vlieland</title>
        <meta
          name="description"
          content="Wat te doen op Vlieland? Wadexcursies, zeehondentochten, fietsen, blokarten, vuurtoren, museum en meer. Het complete overzicht, los te boeken of als compleet programma."
        />
        <link rel="canonical" href={URL} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Activiteiten Vlieland: wat te doen op het eiland" />
        <meta property="og:description" content="Het complete overzicht van activiteiten op Vlieland: wadexcursie, zeehonden, fietsen, cultuur en meer." />
        <meta property="og:url" content={URL} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://bureauvlieland.nl/" },
            { "@type": "ListItem", position: 2, name: "Activiteiten Vlieland", item: URL },
          ],
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Activiteiten op Vlieland",
          itemListElement: themas.flatMap((thema, ti) =>
            thema.items.map((item, ii) => ({
              "@type": "ListItem",
              position: ti * 10 + ii + 1,
              name: item.label,
              url: `https://bureauvlieland.nl${item.to}`,
            })),
          ),
        })}</script>
      </Helmet>

      <Navigation />
      <LandingBreadcrumb items={[{ label: "Activiteiten Vlieland" }]} />

      <main id="main-content">
        <PageHero
          image={heroImage}
          alt="Een groep bij de Vliehors Expres op het strand van Vlieland"
          eyebrow={EYEBROW}
          title="Activiteiten op Vlieland: wat kunt u doen?"
          intro="Het complete overzicht van wat er op het eiland te beleven valt. Los te boeken, of in één keer geregeld als compleet programma."
          cta={{ label: "Bekijk alle bouwstenen", to: "/bouwstenen" }}
          secondary={{ label: "Stel een programma samen", to: "/programma-samenstellen" }}
        />

        <Section>
          <Container size="wide">
            <div className="grid gap-10 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SectionHeader title="Klein eiland, veel te beleven" />
                <Paragraphs
                  className="mt-6 max-w-3xl"
                  items={[
                    "Vlieland is het kleinste bewoonde Waddeneiland: autoluw, ongerept en midden in UNESCO-Werelderfgoed. Juist die schaal maakt het eiland bijzonder. In een paar dagen ervaart u het wad, de duinen, het strand, de bossen én het dorp. Of u nu komt voor een dag, een bedrijfsuitje of een familieweekend, er is meer te doen dan veel bezoekers verwachten.",
                    "Hieronder vindt u de activiteiten op Vlieland thematisch geordend. Alles is los te boeken, maar voor groepen stellen wij vaak een compleet programma samen, inclusief de overtocht, lunch en eventueel een overnachting. Eén aanvraag, één factuur, één aanspreekpunt.",
                  ]}
                />
              </div>
              <FactList
                className="self-start"
                title="In het kort"
                summary="Op Vlieland zijn de populairste activiteiten een wadexcursie met gids, een zeehondentocht per boot, fietsen door de duinen en bossen, de Vliehors Expres naar het westelijke strand, blokarten, de vuurtoren beklimmen en Museum Tromp's Huys. Het eiland is autoluw en bereikbaar met de veerboot vanuit Harlingen (45 minuten met de sneldienst, circa 90 minuten met de gewone boot). Bureau Vlieland boekt losse activiteiten of een compleet groepsprogramma met één factuur."
                items={[
                  { icon: Ship, label: "Bereikbaar", value: "Veerboot vanuit Harlingen, 45 tot 90 minuten" },
                  { icon: Bike, label: "Vervoer", value: "Autoluw: fiets en te voet" },
                  { icon: CalendarDays, label: "Hoogseizoen", value: "Mei tot en met oktober" },
                  { icon: Clock, label: "Dagje eiland", value: "Boot van 9:00 heen, begin van de avond terug" },
                ]}
              />
            </div>
          </Container>
        </Section>

        <Section tone={themesAt.tone}>
          <Container size="wide">
            <SectionHeader
              eyebrow={EYEBROW}
              number={themesAt.number}
              title="Wat is er te doen op Vlieland?"
              intro="Thematisch geordend. Alles is los te boeken of onderdeel van een compleet programma."
            />
            <div className="mt-12 space-y-12">
              {themas.map(({ icon: Icon, title, intro, items }) => (
                <div key={title}>
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-display text-display-md font-medium text-foreground">{title}</h3>
                      <p className="mt-1 max-w-2xl text-muted-foreground">{intro}</p>
                    </div>
                  </div>
                  <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={title}>
                    {items.map((item) => (
                      <li key={item.label + item.to}>
                        <LinkCard title={item.label} text={item.description} to={item.to} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        <ActivityFilter number={filterAt.number} tone={filterAt.tone} eyebrow={EYEBROW} />

        <SeeAlsoActivities
          number={detailAt.number}
          tone={detailAt.tone}
          eyebrow={EYEBROW}
          title="Activiteiten in detail"
          intro="Tien activiteiten met een eigen pagina: wat u kunt verwachten, praktische informatie en veelgestelde vragen."
          links={featuredActivities}
        />

        <BodySection section={dayPlan} tone={dayPlanAt.tone} eyebrow={EYEBROW} number={dayPlanAt.number} />
        <BodySection section={seasons} tone={seasonsAt.tone} eyebrow={EYEBROW} number={seasonsAt.number} />

        <GoogleReviewsBlock limit={3} title="Wat klanten zeggen" subtitle="Recente Google-reviews over Bureau Vlieland" />

        <RouteChooser
          title="Liever in één keer geregeld?"
          intro="Voor groepen stellen wij een compleet programma samen: boot, activiteiten, lunch en eventueel een overnachting. Eén aanvraag, één factuur."
        />

        <FaqSection schemaId="activiteiten-vlieland" pageUrl={URL} title="Veelgestelde vragen over activiteiten op Vlieland" items={faq} />
        <RelatedLinks />
      </main>

      <Footer />
    </div>
  );
};

export default ActiviteitenVlieland;
