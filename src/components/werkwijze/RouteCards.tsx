import { Link } from "react-router-dom";
import { ArrowRight, Compass, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RESPONSE_TIME } from "@/content/promises";
import { Container, Pill, Section, SectionHeader, type SectionTone } from "@/components/system";
import { Checklist } from "@/components/landing/sections";

const routes = [
  {
    pill: "Met persoonlijk advies",
    icon: Compass,
    title: "Vertel ons wat u zoekt",
    description: `Groepsgrootte, periode en wensen in twee minuten. Wij denken met u mee en sturen ${RESPONSE_TIME.within} een vrijblijvend voorstel, met prijzen per onderdeel.`,
    points: [
      "Voor elke groep, van 8 tot 150 personen",
      "Voorstel op basis van uw doel en sfeer",
      "Volledige flexibiliteit in opzet",
      "Eén vast aanspreekpunt gedurende het traject",
    ],
    cta: { label: "Start uw aanvraag", to: "/programma-op-maat" },
    primary: true,
  },
  {
    pill: "Zelf doen",
    icon: Sparkles,
    title: "Zelf uw programma samenstellen",
    description:
      "U weet al precies wat u wilt? Stel uw programma zelf samen uit onze bouwstenen. Prijzen per onderdeel, transparant en in een paar minuten klaar.",
    points: [
      "Direct inzicht in beschikbaarheid en prijzen",
      "Bouwstenen van alle eilandpartners",
      RESPONSE_TIME.short,
      "Aanpassen kan altijd in overleg",
    ],
    cta: { label: "Open de programma-bouwer", to: "/programma-samenstellen" },
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
        intro="Vertel ons wat u zoekt, of puzzel zelf: beide routes leiden tot één compleet programma met één factuur."
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
