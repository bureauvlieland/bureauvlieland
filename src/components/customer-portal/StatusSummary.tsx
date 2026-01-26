import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusSummaryProps {
  total: number;
  confirmed: number;
  pending: number;
  alternative: number;
  progress: number;
  className?: string;
  variant?: "default" | "compact";
}

export const StatusSummary = ({
  total,
  confirmed,
  pending,
  alternative,
  progress,
  className,
  variant = "default",
}: StatusSummaryProps) => {
  // Compact variant for sidebar
  if (variant === "compact") {
    return (
      <div className={cn("bg-muted/50 rounded-lg p-3", className)}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Status</span>
          <span className="text-xs text-muted-foreground">
            {confirmed}/{total}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-600" />
            {confirmed}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-amber-600" />
            {pending}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3 text-blue-600" />
            {alternative}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-muted/50 rounded-lg p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Status</h3>
        <span className="text-sm text-muted-foreground">
          {confirmed} van {total} bevestigd
        </span>
      </div>
      
      <Progress value={progress} className="h-2 mb-4" />
      
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span>
            <span className="font-medium">{confirmed}</span>{" "}
            <span className="text-muted-foreground">bevestigd</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600" />
          <span>
            <span className="font-medium">{pending}</span>{" "}
            <span className="text-muted-foreground">wachtend</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          <span>
            <span className="font-medium">{alternative}</span>{" "}
            <span className="text-muted-foreground">{alternative === 1 ? "alternatief" : "alternatieven"}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
