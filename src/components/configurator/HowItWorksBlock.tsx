import { CheckCircle2, CalendarDays, Search, FileCheck, Receipt, Eye } from "lucide-react";

const steps = [
  {
    icon: CheckCircle2,
    title: "Kies wat past bij uw groep",
    description: "Selecteer activiteiten, catering en vervoer",
  },
  {
    icon: CalendarDays,
    title: "Meerdere dagen?",
    description: "Wij kunnen ook logies verzorgen",
  },
  {
    icon: Search,
    title: "Beschikbaarheid controleren",
    description: "Wij checken bij alle aanbieders",
  },
  {
    icon: FileCheck,
    title: "Bevestiging per onderdeel",
    description: "U ontvangt bericht zodra bevestigd",
  },
  {
    icon: Receipt,
    title: "Directe facturering",
    description: "Elke aanbieder factureert rechtstreeks",
  },
  {
    icon: Eye,
    title: "Wij bewaken het overzicht",
    description: "Bureau Vlieland coördineert alles",
  },
];

export const HowItWorksBlock = () => {
  return (
    <div className="bg-muted/30 border border-border rounded-xl p-6 md:p-8 mb-8">
      <h2 className="text-xl font-display font-semibold text-center mb-6">
        Zo werkt het
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-background/50"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground leading-tight">
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
