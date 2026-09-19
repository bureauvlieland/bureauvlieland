import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, MessageSquareHeart, PenLine, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "./Container";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";

/**
 * Het keuzeblok onderaan een marketingpagina (ontwerpsysteem fase 3):
 * drie routes naar een aanvraag, met "zelf samenstellen" als de primaire.
 * Vervangt de CTA-band en het losse routeblok.
 */
interface RouteChooserProps {
  title?: string;
  intro?: string;
}

const ROUTES: { icon: LucideIcon; title: string; text: string; to: string; label: string; primary?: boolean }[] = [
  {
    icon: PenLine,
    title: "Stel zelf uw programma samen",
    text: "Kies activiteiten, catering en vervoer in een paar stappen. U ziet meteen prijzen per onderdeel.",
    to: "/programma-samenstellen",
    label: "Begin met samenstellen",
    primary: true,
  },
  {
    icon: MessageSquareHeart,
    title: "Programma op maat",
    text: "Liever niet zelf puzzelen? Vertel ons uw wensen, dan sturen wij een persoonlijk voorstel.",
    to: "/programma-op-maat",
    label: "Vertel ons uw wensen",
  },
  {
    icon: BookOpen,
    title: "Voorbeeldprogramma's",
    text: "Kant-en-klare dagindelingen van eerdere groepen, om van te starten of ideeën op te doen.",
    to: "/voorbeeldprogrammas",
    label: "Bekijk de voorbeelden",
  },
];

export const RouteChooser = ({
  title = "Klaar om te beginnen?",
  intro = "Vrijblijvend, en binnen 5 werkdagen een voorstel. Kies de route die bij u past.",
}: RouteChooserProps) => (
  <Section tone="dark">
    <Container size="wide">
      <SectionHeader onDark eyebrow="Uw volgende stap" title={title} intro={intro} align="center" />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {ROUTES.map((route) => {
          const Icon = route.icon;
          return (
            <div
              key={route.to}
              className="flex flex-col rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-6"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/10 text-sand">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-display-md font-medium text-primary-foreground">{route.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-sand/90">{route.text}</p>
              <Button asChild size="lg" variant={route.primary ? "default" : "inverseOutline"} className="mt-6 w-full sm:w-auto">
                <Link to={route.to}>
                  {route.label}
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
