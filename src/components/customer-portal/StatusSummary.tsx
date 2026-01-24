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
}

export const StatusSummary = ({
  total,
  confirmed,
  pending,
  alternative,
  progress,
  className,
}: StatusSummaryProps) => {
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
            <span className="text-muted-foreground">alternatief</span>
          </span>
        </div>
      </div>
    </div>
  );
};
