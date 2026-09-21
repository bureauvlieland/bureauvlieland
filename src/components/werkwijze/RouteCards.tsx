import { Link } from "react-router-dom";
import { ArrowRight, Compass, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RESPONSE_TIME } from "@/content/promises";
import { Container, Pill, Section, SectionHeader, type SectionTone } from "@/components/system";
import { Checklist } from "@/components/landing/sections";

const routes = [
  {
    pill: "Direct online",
    icon: Sparkles,
    title: "Zelf uw programma samenstellen",
    description:
      "U weet ongeveer wat u wilt? Stel uw programma direct samen uit onze bouwstenen. Prijzen per onderdeel, transparant en in een paar minuten klaar.",
    points: [
      "Direct inzicht in beschikbaarheid en prijzen",
      "Bouwstenen van alle eilandpartners",
      RESPONSE_TIME.short,
      "Aanpassen kan altijd in overleg",
    ],
    cta: { label: "Stel uw programma samen", to: "/programma-samenstellen" },
    primary: true,
  },
  {
    pill: "Met persoonlijk advies",
    icon: Compass,
    title: "Programma op maat",
    description: `Complexere wens, groot gezelschap of liever sparren? Wij denken met u mee en stellen ${RESPONSE_TIME.within} een voorstel op maat samen.`,
    points: [
      "Persoonlijk gesprek met een eilandkenner",
      "Voorstel op basis van uw doel en sfeer",
      "Volledige flexibiliteit in opzet",
      "Eén vast aanspreekpunt gedurende het traject",
    ],
    cta: { label: "Vraag maatwerk aan", to: "/programma-op-maat" },
    primary: false,
  },
];

/** De twee routes naar een programma, als inhoud van de werkwijzepagina. */
export const RouteCards = ({ number, tone }: { number: string; tone: SectionTone }) => (
  <Section tone={tone}>
    <Container size="wide">
      <SectionHeader
        eyebrow="Werkwijze"
        number={number}
        title="Twee manieren om met ons te starten"
        intro="Of u nu direct aan de slag wilt of liever met ons meedenkt: beide routes leiden tot één compleet programma met één factuur."
        align="center"
      />
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {routes.map((route) => {
          const Icon = route.icon;
          return (
            <div key={route.cta.to} className="flex flex-col rounded-lg border border-border bg-card p-6 md:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <Pill tone="brand">{route.pill}</Pill>
              </div>
              <h3 className="mt-5 font-display text-display-md font-medium text-foreground">{route.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{route.description}</p>
              <div className="mt-6 flex-1">
                <Checklist items={route.points} />
              </div>
              <Button asChild size="lg" variant={route.primary ? "default" : "outline"} className="mt-8 w-full sm:w-auto">
                <Link to={route.cta.to}>
                  {route.cta.label}
                  {route.primary && <ArrowRight aria-hidden="true" />}
                </Link>
              </Button>
            </div>
          );
        })}
      </div>
    </Container>
  </Section>
);
