import { BedDouble, BookOpen, MessageSquareHeart, UtensilsCrossed, Zap, type LucideIcon } from "lucide-react";
import { Container, LinkCard, MediaCard, Pill, Section, SectionHeader } from "@/components/system";
import beachActivity from "@/assets/beach-activity.jpg";

/**
 * De routekeuze onder de hero (ontwerpsysteem fase 4 deel 3): één foto
 * voor de meest gekozen route en de andere vijf als compacte linkkaarten,
 * zodat de keuze op een telefoon één scherm is in plaats van vier.
 */
interface Route {
  title: string;
  href: string;
  duration: string;
  description: string;
  bestFor: string;
  icon: LucideIcon;
}

const primaryRoutes: Route[] = [
  {
    title: "Losse activiteiten direct boeken",
    href: "/activiteiten-boeken",
    duration: "± 2 min",
    description: "Bekijk de beschikbaarheid en boek activiteiten direct online bij onze eilandpartners.",
    bestFor: "Direct boeken, geen offerte",
    icon: Zap,
  },
  {
    title: "Programma op maat",
    href: "/programma-op-maat",
    duration: "Wij stellen samen",
    description: "U vertelt wat u zoekt, wij stellen het voor u samen en sturen een persoonlijk voorstel.",
    bestFor: "Maatwerk, advies vooraf",
    icon: MessageSquareHeart,
  },
  {
    title: "Voorbeeldprogramma's bekijken",
    href: "/voorbeeldprogrammas",
    duration: "± 2 min",
    description: "Geen idee waar te beginnen? Bekijk kant-en-klare programma's en gebruik er één als startpunt.",
    bestFor: "Inspiratie, bestaand programma als startpunt",
    icon: BookOpen,
  },
];

const secondaryRoutes: Route[] = [
  {
    title: "Catering aanvragen",
    href: "/catering-aanvragen",
    duration: "± 3 min",
    description: "Lunch, borrel, BBQ of diner: wij zijn dé cateraar op Vlieland.",
    bestFor: "Alleen eten en drinken",
    icon: UtensilsCrossed,
  },
  {
    title: "Logies aanvragen",
    href: "/logies-aanvragen",
    duration: "± 3 min",
    description: "Overnachten op Vlieland: wij benaderen de juiste hotels en groepsaccommodaties.",
    bestFor: "Alleen overnachting",
    icon: BedDouble,
  },
];

const RouteLink = ({ route }: { route: Route }) => (
  <LinkCard
    icon={route.icon}
    title={route.title}
    text={route.description}
    to={route.href}
    pills={
      <>
        <Pill tone="neutral">{route.duration}</Pill>
        <Pill tone="brand">{route.bestFor}</Pill>
      </>
    }
  />
);

export const RoutePicker = ({ number }: { number: string }) => (
  <Section id="routes" className="scroll-mt-24">
    <Container size="wide">
      <SectionHeader
        eyebrow="Welke route past bij u?"
        number={number}
        title="Zes manieren om bij ons aan te kloppen"
        intro="Eén klein onderdeel, een compleet programma dat u zelf samenstelt of vanuit een voorbeeld start, of volledig maatwerk: kies wat het beste past. Overal ziet u meteen prijzen, en bij een deel van het aanbod boekt u direct."
      />
      <div className="mt-12 grid gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-5">
          <MediaCard
            image={beachActivity}
            alt="Activiteit op het strand van Vlieland"
            badge={<Pill tone="brand" className="bg-card">Meest gekozen</Pill>}
            meta="± 5 tot 10 min · Losse activiteit óf compleet programma"
            title="Stel uw programma samen"
            text="Van één losse activiteit tot een compleet meerdaags programma, inclusief boot en fietsen. U ziet meteen prijzen per onderdeel."
            to="/programma-samenstellen"
            linkLabel="Begin met samenstellen"
            className="h-full"
          />
        </div>
        <div className="flex flex-col gap-3 lg:col-span-7">
          {primaryRoutes.map((route) => (
            <RouteLink key={route.href} route={route} />
          ))}
          <p className="mt-3 text-eyebrow font-medium uppercase text-muted-foreground">Losse onderdelen</p>
          {secondaryRoutes.map((route) => (
            <RouteLink key={route.href} route={route} />
          ))}
        </div>
      </div>
    </Container>
  </Section>
);
