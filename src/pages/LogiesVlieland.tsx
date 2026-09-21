import { Helmet } from "react-helmet";
import { Building, Building2, CheckCircle2, ClipboardList, Home, MessageSquareHeart, PenLine, Receipt, Scale, Search, Users } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { FaqSection } from "@/components/FaqSection";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { LandingPageStructuredData } from "@/components/LandingPageStructuredData";
import { BodySection, Paragraphs } from "@/components/landing/sections";
import { sectionCounter } from "@/components/landing/sectionCounter";
import { ProcessSteps, type ProcessStep } from "@/components/werkwijze/ProcessSteps";
import { Container, FactList, PageHero, RouteChooser, Section, SectionHeader, type RouteChooserRoute } from "@/components/system";
import type { LandingSection } from "@/content/landings/types";

const URL = "https://bureauvlieland.nl/logies-vlieland";
const EYEBROW = "Logies op Vlieland";
const DESCRIPTION =
  "Zoek en vergelijk groepsaccommodaties op Vlieland. Hotels, vakantiehuizen en groepsverblijven: wij regelen de offertes, u kiest.";
const heroImage = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/building-block-images/1778074823160-hotel_zeezicht_2.jpg`;

const types: LandingSection = {
  kind: "features",
  title: "Accommodatietypes op Vlieland",
  intro: "Van luxe hotels tot ruime groepsaccommodaties: er is altijd iets dat past.",
  columns: 2,
  items: [
    { icon: Building2, title: "Hotel", text: "Comfort en gemak in het dorp. Ideaal voor zakelijke groepen die ontzorging zoeken." },
    { icon: Home, title: "Vakantiehuis", text: "Privacy en huiselijke sfeer voor kleinere teams. Eigen keuken en woonruimte." },
    { icon: Users, title: "Groepsaccommodatie", text: "Ideaal voor grote groepen. Gezamenlijke ruimtes voor vergaderen en ontspannen." },
    { icon: Building, title: "Appartement", text: "Onafhankelijk verblijf met flexibiliteit. Geschikt voor teams die eigen regie willen." },
  ],
};

const steps: ProcessStep[] = [
  { icon: ClipboardList, title: "Vul uw wensen in", description: "Datum, groepsgrootte en type accommodatie." },
  { icon: Search, title: "Wij zoeken voor u", description: "Bureau Vlieland vraagt offertes aan bij geschikte accommodaties." },
  { icon: Scale, title: "Vergelijk offertes", description: "U ontvangt een overzicht van alle opties naast elkaar." },
  { icon: CheckCircle2, title: "Boek via Bureau Vlieland", description: "Wij begeleiden het boekingsproces en zetten alles op één factuur." },
];

const why: LandingSection = {
  kind: "prose",
  title: "Waarom via Bureau Vlieland?",
  paragraphs: [
    "Een verblijf voor een groep vraagt om meer dan een beschikbare kamer: de indeling, de gezamenlijke ruimte en de afstand tot het dorp bepalen of het werkt. Daarom zoeken wij mee.",
  ],
  checklist: [
    "Lokale kennis: wij kennen alle accommodaties persoonlijk en weten wat bij uw groep past.",
    "Vrijblijvend: geen verplichtingen tot u boekt. Vergelijk rustig alle opties.",
    "Eén aanspreekpunt: wij regelen de communicatie met de accommodaties. U hoeft niet zelf te bellen.",
    "Gecombineerd boeken: combineer logies met activiteiten en catering tot een compleet programma.",
  ],
};

const routes: RouteChooserRoute[] = [
  {
    icon: Building2,
    title: "Vraag logies aan",
    text: "Datum, groepsgrootte en type verblijf. Wij vragen offertes op bij geschikte accommodaties en u vergelijkt.",
    to: "/logies-aanvragen",
    label: "Vraag logies aan",
    primary: true,
  },
  {
    icon: PenLine,
    title: "Logies in een compleet programma",
    text: "Combineer het verblijf met activiteiten, catering en vervoer. U ziet meteen prijzen per onderdeel.",
    to: "/programma-samenstellen",
    label: "Stel uw programma samen",
  },
  {
    icon: MessageSquareHeart,
    title: "Programma op maat",
    text: "Liever niet zelf puzzelen? Vertel ons uw wensen, dan sturen wij een persoonlijk voorstel.",
    to: "/programma-op-maat",
    label: "Vertel ons uw wensen",
  },
];

const faq = [
  {
    question: "Welke soorten logies zijn er op Vlieland?",
    answer: "Op Vlieland vindt u hotels, appartementen, groepsaccommodaties, vakantiehuizen en campings. Wij bemiddelen voor groepen bij alle typen.",
  },
  {
    question: "Regelen jullie de accommodatie voor mijn groep?",
    answer: "Ja. Wij vragen op basis van uw data en groepsgrootte offertes op bij meerdere accommodaties, zodat u de opties naast elkaar kunt vergelijken.",
  },
  {
    question: "Hoe ver vooruit moet ik logies reserveren?",
    answer: "Voor het hoogseizoen en rond evenementen adviseren wij zes tot twaalf maanden vooraf. Buiten het seizoen is enkele weken vaak voldoende.",
  },
  {
    question: "Kan ik logies en programma op één factuur krijgen?",
    answer: "Ja. Bureau Vlieland factureert logies, activiteiten, catering en overtocht centraal op één factuur.",
  },
];

const LogiesVlieland = () => {
  const next = sectionCounter();
  const typesSection = next();
  const stepsSection = next();
  const whySection = next();

  return (
    <>
      <Helmet>
        <title>Logies op Vlieland voor groepen | Bureau Vlieland</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Logies op Vlieland voor groepen | Bureau Vlieland" />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:image" content="https://bureauvlieland.nl/og-image.jpg" />
        <meta property="og:url" content={URL} />
        <meta property="og:type" content="website" />
      </Helmet>
      <LandingPageStructuredData
        serviceName="Logies op Vlieland voor groepen"
        serviceDescription={DESCRIPTION}
        canonicalUrl={URL}
        breadcrumbItems={[
          { name: "Home", url: "https://bureauvlieland.nl" },
          { name: "Logies Vlieland", url: URL },
        ]}
      />

      <Navigation />
      <LandingBreadcrumb items={[{ label: "Logies Vlieland" }]} />

      <main id="main-content">
        <PageHero
          image={heroImage}
          alt="Hotel met uitzicht op zee op Vlieland"
          eyebrow={EYEBROW}
          title="Logies op Vlieland voor groepen"
          intro="Op zoek naar een verblijf voor uw team of organisatie? Bureau Vlieland zoekt en vergelijkt accommodaties voor u. Vrijblijvend, persoonlijk en met lokale kennis."
          cta={{ label: "Vraag logies aan", to: "/logies-aanvragen" }}
          secondary={{ label: "Liever maatwerk?", to: "/programma-op-maat" }}
        />

        <Section>
          <Container size="wide">
            <div className="grid gap-10 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SectionHeader title="Wij zoeken, u kiest" />
                <Paragraphs
                  className="mt-6 max-w-3xl"
                  items={[
                    "Bureau Vlieland is gevestigd op het eiland en kent alle accommodaties persoonlijk. Wij weten welke verblijven geschikt zijn voor welke groepen en schakelen snel met lokale partners.",
                    "U vult één keer uw wensen in. Wij doen het zoekwerk en vragen offertes aan bij geschikte accommodaties. U ontvangt een overzicht om te vergelijken en Bureau Vlieland begeleidt het verdere boekingsproces.",
                  ]}
                />
              </div>
              <FactList
                className="self-start"
                items={[
                  { icon: Building2, label: "Aanbod", value: "Hotels, vakantiehuizen, groepsaccommodaties en appartementen" },
                  { icon: Search, label: "Werkwijze", value: "Wij vragen offertes op bij geschikte accommodaties, u vergelijkt" },
                  { icon: CheckCircle2, label: "Vrijblijvend", value: "Geen verplichtingen tot u boekt" },
                  { icon: Receipt, label: "Eén factuur", value: "Logies, activiteiten, catering en overtocht samen" },
                ]}
              />
            </div>
          </Container>
        </Section>

        <BodySection section={types} tone={typesSection.tone} eyebrow={EYEBROW} number={typesSection.number} />
        <ProcessSteps
          number={stepsSection.number}
          tone={stepsSection.tone}
          eyebrow={EYEBROW}
          title="Hoe werkt het?"
          intro="In vier stappen van wens naar boeking, zonder gedoe."
          steps={steps}
        />
        <BodySection section={why} tone={whySection.tone} eyebrow={EYEBROW} number={whySection.number} />

        <RouteChooser
          title="Klaar om logies te zoeken?"
          intro="Vul uw wensen in en ontvang offertes van geschikte accommodaties. Vrijblijvend en zonder verplichtingen."
          routes={routes}
        />

        <FaqSection schemaId="logies-vlieland" pageUrl={URL} items={faq} />
        <RelatedLinks />
      </main>

      <Footer />
    </>
  );
};

export default LogiesVlieland;
