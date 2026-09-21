import { CheckCircle2, FileText, MapPin, MessageSquare, Receipt, RefreshCw } from "lucide-react";
import { RESPONSE_TIME } from "@/content/promises";
import { Container, Section, SectionHeader, type SectionTone } from "@/components/system";

const steps = [
  { icon: MessageSquare, title: "Uw wens", description: "U deelt datum, groepsgrootte en gewenste sfeer met ons." },
  { icon: FileText, title: "Voorstel", description: `Direct online in de programma-bouwer, of ${RESPONSE_TIME.within} een voorstel op maat.` },
  { icon: RefreshCw, title: "Afstemming", description: "Wij stemmen wijzigingen en wensen met u af tot het programma helemaal past." },
  { icon: CheckCircle2, title: "Bevestiging", description: "U geeft akkoord, wij boeken alle eilandpartners voor u." },
  { icon: MapPin, title: "Op het eiland", description: "Alle partners zijn voorbereid op uw komst. U kunt direct genieten van uw programma." },
  { icon: Receipt, title: "Eén factuur", description: "Na afloop ontvangt u één overzichtelijke factuur voor het hele programma." },
];

/** De zes stappen van eerste vraag tot factuur. */
export const ProcessSteps = ({ number, tone }: { number: string; tone: SectionTone }) => (
  <Section tone={tone}>
    <Container size="wide">
      <SectionHeader
        eyebrow="Werkwijze"
        number={number}
        title="Zo verloopt het proces"
        intro="Van eerste vraag tot afsluitende factuur, overzichtelijk in zes stappen."
        align="center"
      />
      <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, idx) => {
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
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </li>
          );
        })}
      </ol>
    </Container>
  </Section>
);
