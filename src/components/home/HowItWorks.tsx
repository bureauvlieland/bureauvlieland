import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import stapVertellen from "@/assets/stap-vertellen.webp";
import stapSamenstellen from "@/assets/stap-samenstellen.webp";
import stapAkkoord from "@/assets/stap-akkoord.webp";
import { RESPONSE_TIME } from "@/content/promises";
import { Container, Section, SectionHeader } from "@/components/system";
import { openPreSalesChat } from "@/components/site/openPreSalesChat";
import { cn } from "@/lib/utils";

/**
 * De sectie direct onder de hero (plan klantreis en ondertekening, fase 1).
 * Vervangt het keuzeblok met zes ingangen: één voordeur (het formulier), in
 * drie stappen uitgelegd, met inspiratie en de chat als zijpaden en de
 * programma-bouwer als tekstlink voor wie zelf wil puzzelen.
 *
 * Elke stap staat met nummer en titel op één doorlopende lijn, de kaart met
 * de uitleg eronder; zo leest de rij als één route van links naar rechts.
 * De eerste cirkel is gevuld: daar begint de bezoeker. De foto blijft, maar
 * klein in de kaart (ontwerpsysteem, principe 3: mensen in plaats van
 * iconen); bij stap 2 staat Erwin zelf, want "wij" zijn mensen die je kunt
 * zien.
 */
interface Step {
  image: string;
  alt: string;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    image: stapVertellen,
    alt: "Houten wegwijzer op het strand van Vlieland met activiteiten als wadlopen, suppen en powerkiten",
    title: "U vertelt wat u zoekt",
    text: "Groepsgrootte, periode en wat u nodig heeft: activiteiten, eten en drinken, overnachting, boot en fietsen. Twee minuten werk, vrijblijvend.",
  },
  {
    image: stapSamenstellen,
    alt: "Erwin Soolsma van Bureau Vlieland aan een picknicktafel op het strand",
    title: "Wij stellen het samen",
    text: `${RESPONSE_TIME.short}, met prijzen per onderdeel. Van eilanders die alle partners kennen. Is iets nog niet duidelijk, dan vragen we even door.`,
  },
  {
    image: stapAkkoord,
    alt: "Grote groep juicht in de duinen van Vlieland",
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
      <ol className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step, idx) => (
          <li key={step.title} className="row-span-2 grid grid-rows-subgrid gap-5">
            {/* Subgrid: de kaarten beginnen op dezelfde hoogte, ook als een titel doorloopt.
                Nummer en lijn staan op de eerste regel van de titel. */}
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  idx === 0 ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground",
                )}
              >
                {idx + 1}
              </span>
              <h3 className="font-display text-display-md font-medium text-foreground">
                <span className="sr-only">Stap {idx + 1}: </span>
                {step.title}
              </h3>
              <span aria-hidden="true" className="mt-4 h-px min-w-6 flex-1 bg-border" />
            </div>
            <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-5">
              <img
                src={step.image}
                alt={step.alt}
                width={800}
                height={600}
                loading="lazy"
                className="aspect-[4/3] w-24 shrink-0 rounded-sm bg-accent-soft object-cover sm:w-28"
              />
              <p className="text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </div>
          </li>
        ))}
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
