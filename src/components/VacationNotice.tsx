import { Info } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface VacationNoticeProps {
  endDate: string;
  message?: ReactNode;
  className?: string;
  compact?: boolean;
  variant?: "info" | "warning";
}

/**
 * Subtle notice for temporary unavailability.
 * Renders nothing once the end date has passed.
 */
export const VacationNotice = ({
  endDate,
  message,
  className,
  compact = false,
  variant = "info",
}: VacationNoticeProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  if (today > end) return null;

  const formattedEnd = end.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
  });

  const variantClasses = {
    info: "bg-info-soft/50 text-info border-info/20",
    warning: "bg-warning-soft/50 text-warning-foreground border-warning/20",
  };

  return (
    <div
      className={cn(
        "rounded-lg border",
        variantClasses[variant],
        compact ? "text-xs px-3 py-2" : "text-sm px-4 py-3",
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <Info
          className={cn(
            "shrink-0",
            compact ? "h-3.5 w-3.5 mt-0.5" : "h-4 w-4 mt-0.5"
          )}
        />
        <div className="space-y-0.5">
          <p className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
            Beperkt telefonisch bereikbaar t/m {formattedEnd}
          </p>
          {message && (
            <div className={cn("opacity-90", compact ? "text-xs" : "text-sm")}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
