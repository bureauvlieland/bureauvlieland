import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Calendar,
  BedDouble,
  LayoutGrid,
  Receipt,
} from "lucide-react";

type ActiveView = "splash" | "accommodation" | "program" | "billing";

interface ProgramNavigationProps {
  className?: string;
  isMultiDay?: boolean;
  activeView?: ActiveView;
  onNavigate?: (view: ActiveView) => void;
}

export const ProgramNavigation = ({
  className,
  isMultiDay = false,
  activeView = "program",
  onNavigate,
}: ProgramNavigationProps) => {
  const handleClick = (view: ActiveView) => {
    if (onNavigate) {
      onNavigate(view);
    }
  };

  const tabClass = (view: ActiveView) =>
    cn(
      "shrink-0",
      activeView === view && "bg-primary/10 text-primary"
    );

  return (
    <nav
      className={cn(
        "sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b",
        className
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1 py-2 overflow-x-auto">
          {/* Overzicht tab */}
          <Button
            variant={activeView === "splash" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleClick("splash")}
            className={tabClass("splash")}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Overzicht
          </Button>

          {/* Logies tab - alleen bij meerdaagse programma's */}
          {isMultiDay && (
            <Button
              variant={activeView === "accommodation" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleClick("accommodation")}
              className={tabClass("accommodation")}
            >
              <BedDouble className="h-4 w-4 mr-2" />
              Logies
            </Button>
          )}

          {/* Programma tab */}
          <Button
            variant={activeView === "program" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleClick("program")}
            className={tabClass("program")}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Programma
          </Button>

          {/* Facturatie tab */}
          <Button
            variant={activeView === "billing" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleClick("billing")}
            className={tabClass("billing")}
          >
            <Receipt className="h-4 w-4 mr-2" />
            Facturatie
          </Button>
        </div>
      </div>
    </nav>
  );
};
