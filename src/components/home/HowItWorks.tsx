import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileText, MessageSquare, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RESPONSE_TIME } from "@/content/promises";
import { Container, Section, SectionHeader } from "@/components/system";
import { openPreSalesChat } from "@/components/site/openPreSalesChat";

/**
 * De sectie direct onder de hero (plan klantreis en ondertekening, fase 1).
 * Vervangt het keuzeblok met zes ingangen: één voordeur (het formulier), in
 * drie stappen uitgelegd, met inspiratie en de chat als zijpaden en de
 * programma-bouwer als tekstlink voor wie zelf wil puzzelen.
 */
interface Step {
  icon: LucideIcon;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    icon: MessageSquare,
    title: "U vertelt wat u zoekt",
    text: "Groepsgrootte, periode en wat u nodig heeft: activiteiten, eten en drinken, overnachting, boot en fietsen. Twee minuten werk, vrijblijvend.",
  },
  {
    icon: FileText,
    title: "Wij stellen het samen",
    text: `${RESPONSE_TIME.short}, met prijzen per onderdeel. Van eilanders die alle partners kennen en weten wat bij uw groep past.`,
  },
  {
    icon: CheckCircle2,
    title: "U geeft akkoord in uw portaal",
    text: "Eén akkoord, één factuur. Wij boeken alle eilandpartners en blijven uw aanspreekpunt, ook tijdens uw verblijf.",
  },
];

export const HowItWorks = ({ number }: { number: string }) => (
  <Section id="zo-werkt-het" className="scroll-mt-24">
    <Container size="wide">
      <SectionHeader
        eyebrow="Zo werkt het"
        number={number}
        title="Drie stappen naar uw programma"
        intro="U hoeft niets zelf uit te zoeken. Vertel ons wat u zoekt, wij doen de rest."
      />
      <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-eyebrow font-medium uppercase text-primary">Stap {idx + 1}</span>
              </div>
              <h3 className="mt-4 font-display text-display-md font-medium text-foreground">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </li>
          );
        })}
      </ol>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild size="xl">
          <Link to="/programma-op-maat">
            Start uw aanvraag
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
        <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:text-right">
          <p>
            Liever eerst inspiratie?{" "}
            <Link to="/voorbeeldprogrammas" className="text-primary underline underline-offset-4">
              Bekijk voorbeeldprogramma's
            </Link>
          </p>
          <p>
            Liever even overleggen?{" "}
            <button type="button" onClick={openPreSalesChat} className="text-primary underline underline-offset-4">
              Stel uw vraag via de chat
            </button>
          </p>
        </div>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Liever zelf samenstellen en direct prijzen zien?{" "}
        <Link to="/programma-samenstellen" className="underline underline-offset-4 hover:text-foreground">
          Open de programma-bouwer
        </Link>
        .
      </p>
    </Container>
  </Section>
);
