import { Bike, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import cyclingGroup from "@/assets/cycling-group.jpg";

interface FietsverhuurBannerProps {
  variant?: "default" | "compact" | "sidebar";
  className?: string;
}

export const FietsverhuurBanner = ({ 
  variant = "default",
  className 
}: FietsverhuurBannerProps) => {
  const url = "https://bureauvlieland.fietsreserveren.nl/";

  if (variant === "compact") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-3 p-4 rounded-lg border bg-primary/5 hover:bg-primary/10 transition-colors group",
          className
        )}
      >
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Bike className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Fietsen reserveren</p>
          <p className="text-xs text-muted-foreground">Ontdek Vlieland op de fiets</p>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </a>
    );
  }

  if (variant === "sidebar") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "block rounded-xl overflow-hidden border group hover:shadow-md transition-shadow",
          className
        )}
      >
        <div className="relative h-28 overflow-hidden">
          <img
            src={cyclingGroup}
            alt="Fietsen op Vlieland"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white font-semibold text-sm flex items-center gap-1.5">
              <Bike className="h-4 w-4" />
              Liever zelf fietsen boeken?
            </p>
          </div>
        </div>
        <div className="p-3 bg-card">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Reserveer eenvoudig fietsen voor uw groep.
            </p>
          <span className="text-xs font-medium text-primary flex items-center gap-1 mt-1.5 group-hover:underline">
            Reserveer nu <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </a>
    );
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20",
      className
    )}>
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bike className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Ontdek Vlieland op de fiets</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Reserveer eenvoudig fietsen voor uw hele groep via Bureau Vlieland.
              </p>
            </div>
          </div>
          <div className="md:ml-auto">
            <Button asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                Reserveer fietsen
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        </div>
      </div>
      <div className="absolute -right-4 -bottom-4 opacity-5">
        <Bike className="h-32 w-32 transform rotate-12" />
      </div>
    </div>
  );
};
