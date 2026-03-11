import { Search, FileCheck, ThumbsUp } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Wij checken beschikbaarheid",
    description: "Onze lokale partners bekijken of alles kan op uw gewenste datum",
  },
  {
    icon: FileCheck,
    title: "U ontvangt een voorstel",
    description: "Met definitieve tijden, prijzen en eventuele alternatieven",
  },
  {
    icon: ThumbsUp,
    title: "U bepaalt wat doorgaat",
    description: "Bevestig per onderdeel en wij coördineren de rest",
  },
];

interface HowItWorksBlockProps {
  compact?: boolean;
}

export const HowItWorksBlock = ({ compact = false }: HowItWorksBlockProps) => {
  return (
    <div className={`bg-muted/30 border border-border rounded-xl ${compact ? "p-4" : "p-6 md:p-8"} ${compact ? "mb-0" : "mb-8"}`}>
      <h2 className={`${compact ? "text-base" : "text-xl"} font-display font-semibold text-center ${compact ? "mb-3" : "mb-6"}`}>
        Zo werkt het
      </h2>
      
      <div className={`grid grid-cols-1 ${compact ? "sm:grid-cols-3 gap-2" : "sm:grid-cols-3 gap-4 md:gap-6"}`}>
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={index}
              className={`flex items-start gap-2.5 ${compact ? "p-2" : "p-3"} rounded-lg bg-background/50`}
            >
              <div className={`flex-shrink-0 ${compact ? "w-6 h-6" : "w-8 h-8"} rounded-full bg-primary/10 flex items-center justify-center`}>
                <Icon className={`${compact ? "h-3 w-3" : "h-4 w-4"} text-primary`} />
              </div>
              <div className="min-w-0">
                <p className={`font-medium ${compact ? "text-xs" : "text-sm"} text-foreground leading-tight`}>
                  {step.title}
                </p>
                <p className={`${compact ? "text-[11px]" : "text-xs"} text-muted-foreground mt-0.5`}>
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
