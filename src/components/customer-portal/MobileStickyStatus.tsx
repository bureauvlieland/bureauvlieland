import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileStickyStatusProps {
  completedSteps: number;
  totalSteps: number;
  nextAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const MobileStickyStatus = ({
  completedSteps,
  totalSteps,
  nextAction,
  className,
}: MobileStickyStatusProps) => {
  return (
    <div className={cn(
      "sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b px-4 py-3",
      className
    )}>
      <div className="flex items-center justify-between gap-3">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">
              {completedSteps}/{totalSteps}
            </span>
          </div>
        </div>

        {/* Next action button */}
        {nextAction && (
          <Button 
            size="sm" 
            onClick={nextAction.onClick}
            className="h-8 text-xs"
          >
            {nextAction.label}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};
