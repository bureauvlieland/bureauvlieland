import { MessageSquare, FileText, RefreshCw, CheckCircle2, MapPin, Receipt } from "lucide-react";

const steps = [
  {
    icon: MessageSquare,
    title: "Uw wens",
    description: "U deelt datum, groepsgrootte en gewenste sfeer met ons.",
  },
  {
    icon: FileText,
    title: "Voorstel",
    description: "Direct online (configurator) of binnen 1-3 werkdagen een voorstel op maat.",
  },
  {
    icon: RefreshCw,
    title: "Afstemming",
    description: "Wij stemmen wijzigingen en wensen met u af tot het programma helemaal past.",
  },
  {
    icon: CheckCircle2,
    title: "Bevestiging",
    description: "U geeft akkoord, wij boeken alle eilandpartners voor u.",
  },
  {
    icon: MapPin,
    title: "Op het eiland",
    description: "Alle partners zijn voorbereid op uw komst — u kunt direct genieten van uw programma.",
  },
  {
    icon: Receipt,
    title: "Eén factuur",
    description: "Na afloop ontvangt u één overzichtelijke factuur — voor het hele programma.",
  },
];

export const ProcessSteps = () => {
  return (
    <section className="py-16 sm:py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
            Zo verloopt het proces
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Van eerste vraag tot afsluitende factuur — overzichtelijk in zes stappen.
          </p>
        </div>

        {/* Desktop: horizontal stepper */}
        <div className="hidden lg:block relative">
          <div className="absolute top-8 left-[8%] right-[8%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
          <div className="grid grid-cols-6 gap-4 relative">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <div className="w-16 h-16 rounded-full bg-background border-2 border-primary flex items-center justify-center shadow-soft">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </div>
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile/tablet: vertical timeline */}
        <div className="lg:hidden space-y-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isLast = idx === steps.length - 1;
            return (
              <div key={idx} className="flex gap-4 relative">
                <div className="flex flex-col items-center">
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full bg-background border-2 border-primary flex items-center justify-center shadow-soft">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </div>
                  </div>
                  {!isLast && <div className="w-0.5 flex-1 bg-primary/20 my-2" />}
                </div>
                <div className="flex-1 pb-6">
                  <h3 className="font-display font-semibold text-foreground mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
