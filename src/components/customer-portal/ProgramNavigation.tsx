import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Calendar,
  BedDouble,
  LayoutGrid,
} from "lucide-react";

interface ProgramNavigationProps {
  className?: string;
  isMultiDay?: boolean;
  activeView?: "splash" | "accommodation" | "program";
  onNavigate?: (view: "splash" | "accommodation" | "program") => void;
}

export const ProgramNavigation = ({
  className,
  isMultiDay = false,
  activeView = "program",
  onNavigate,
}: ProgramNavigationProps) => {
  const handleClick = (view: "splash" | "accommodation" | "program") => {
    if (onNavigate) {
      onNavigate(view);
    } else {
      // Fallback: scroll to section
      const sectionMap: Record<string, string> = {
        accommodation: "accommodation",
        program: "program",
        billing: "billing",
      };
      const el = document.getElementById(sectionMap[view] || view);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

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
            className={cn(
              "shrink-0",
              activeView === "splash" && "bg-primary/10 text-primary"
            )}
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
              className={cn(
                "shrink-0",
                activeView === "accommodation" && "bg-primary/10 text-primary"
              )}
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
            className={cn(
              "shrink-0",
              activeView === "program" && "bg-primary/10 text-primary"
            )}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Programma
          </Button>
        </div>
      </div>
    </nav>
  );
};
