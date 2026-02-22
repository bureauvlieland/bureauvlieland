import { CheckCircle2, Search, FileCheck, ThumbsUp, Heart } from "lucide-react";

const steps = [
  {
    icon: CheckCircle2,
    title: "Stel uw programma samen",
    description: "Kies activiteiten die passen bij uw groep",
  },
  {
    icon: Search,
    title: "Wij checken beschikbaarheid",
    description: "Onze lokale partners bekijken of alles kan",
  },
  {
    icon: FileCheck,
    title: "U ontvangt een voorstel",
    description: "Met definitieve tijden en prijzen",
  },
  {
    icon: ThumbsUp,
    title: "Bevestig wat u wilt",
    description: "U bepaalt per onderdeel wat doorgaat",
  },
  {
    icon: Heart,
    title: "Wij coördineren alles",
    description: "Zodat u zich nergens zorgen over hoeft te maken",
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
