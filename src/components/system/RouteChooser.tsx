import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, MessageSquareHeart, PenLine, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isPlainHref } from "@/lib/href";
import { Container } from "./Container";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";

/**
 * Het keuzeblok onderaan een marketingpagina (ontwerpsysteem fase 3):
 * drie routes naar een aanvraag, met "zelf samenstellen" als de primaire.
 * Vervangt de CTA-band en het losse routeblok. Een pagina met een ander
 * publiek (Samenwerken) geeft eigen `routes` mee; de vorm blijft gelijk.
 */
export interface RouteChooserRoute {
  icon: LucideIcon;
  title: string;
  text: string;
  /** Pad, of een extern adres (`https://…`, `mailto:`). */
  to: string;
  label: string;
  primary?: boolean;
}

interface RouteChooserProps {
  /** Anker voor een knop hogerop de pagina (`#aanvraag`). */
  id?: string;
  eyebrow?: string;
  title?: string;
  intro?: string;
  routes?: RouteChooserRoute[];
}

const DEFAULT_ROUTES: RouteChooserRoute[] = [
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
  id,
  eyebrow = "Uw volgende stap",
  title = "Klaar om te beginnen?",
  intro = "Vrijblijvend, en binnen 5 werkdagen een voorstel. Kies de route die bij u past.",
  routes = DEFAULT_ROUTES,
}: RouteChooserProps) => (
  <Section id={id} tone="dark" className={id ? "scroll-mt-24" : undefined}>
    <Container size="wide">
      <SectionHeader onDark eyebrow={eyebrow} title={title} intro={intro} align="center" />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {routes.map((route) => {
          const Icon = route.icon;
          const inner = (
            <>
              {route.label}
              {route.primary && <ArrowRight aria-hidden="true" />}
            </>
          );
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
                {isPlainHref(route.to) ? (
                  <a href={route.to} {...(route.to.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    {inner}
                  </a>
                ) : (
                  <Link to={route.to}>{inner}</Link>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </Container>
  </Section>
);
