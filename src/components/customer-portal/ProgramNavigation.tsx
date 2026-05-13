import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Calendar,
  BedDouble,
  LayoutGrid,
  Receipt,
  ClipboardList,
  FileSignature,
  Sparkles,
  MapPin,
} from "lucide-react";

type ActiveView =
  | "splash"
  | "accommodation"
  | "program"
  | "practical"
  | "billing"
  | "accept"
  | "today"
  | "map";

export interface TabBadge {
  label: string;
  variant?: "default" | "secondary" | "outline" | "destructive";
}

interface ProgramNavigationProps {
  className?: string;
  isMultiDay?: boolean;
  activeView?: ActiveView;
  onNavigate?: (view: ActiveView) => void;
  badges?: Partial<Record<ActiveView, TabBadge | undefined>>;
  /** Toon "Vandaag" en "Kaart" tabs (event-modus) */
  showEventTabs?: boolean;
}

export const ProgramNavigation = ({
  className,
  isMultiDay = false,
  activeView = "program",
  onNavigate,
  badges = {},
  showEventTabs = false,
}: ProgramNavigationProps) => {
  const handleClick = (view: ActiveView) => {
    onNavigate?.(view);
  };

  const tabClass = (view: ActiveView) =>
    cn("shrink-0 gap-2", activeView === view && "bg-primary/10 text-primary");

  const renderBadge = (view: ActiveView) => {
    const b = badges[view];
    if (!b) return null;
    return (
      <Badge variant={b.variant ?? "secondary"} className="text-[10px] px-1.5 py-0 h-4">
        {b.label}
      </Badge>
    );
  };

  return (
    <nav
      className={cn(
        "sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b",
        className
      )}
      role="tablist"
      aria-label="Programma navigatie"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1 py-2 overflow-x-auto">
          <Button
            variant={activeView === "splash" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleClick("splash")}
            className={tabClass("splash")}
            role="tab"
            aria-selected={activeView === "splash"}
          >
            <LayoutGrid className="h-4 w-4" />
            Overzicht
            {renderBadge("splash")}
          </Button>

          {isMultiDay && (
            <Button
              variant={activeView === "accommodation" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleClick("accommodation")}
              className={tabClass("accommodation")}
              role="tab"
              aria-selected={activeView === "accommodation"}
            >
              <BedDouble className="h-4 w-4" />
              Logies
              {renderBadge("accommodation")}
            </Button>
          )}

          <Button
            variant={activeView === "program" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleClick("program")}
            className={tabClass("program")}
            role="tab"
            aria-selected={activeView === "program"}
          >
            <Calendar className="h-4 w-4" />
            Programma
            {renderBadge("program")}
          </Button>

          <Button
            variant={activeView === "practical" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleClick("practical")}
            className={tabClass("practical")}
            role="tab"
            aria-selected={activeView === "practical"}
          >
            <ClipboardList className="h-4 w-4" />
            Praktisch
            {renderBadge("practical")}
          </Button>

          <Button
            variant={activeView === "billing" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleClick("billing")}
            className={tabClass("billing")}
            role="tab"
            aria-selected={activeView === "billing"}
          >
            <Receipt className="h-4 w-4" />
            Facturatie
            {renderBadge("billing")}
          </Button>

          <Button
            variant={activeView === "accept" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleClick("accept")}
            className={tabClass("accept")}
            role="tab"
            aria-selected={activeView === "accept"}
          >
            <FileSignature className="h-4 w-4" />
            Akkoord
            {renderBadge("accept")}
          </Button>
        </div>
      </div>
    </nav>
  );
};
