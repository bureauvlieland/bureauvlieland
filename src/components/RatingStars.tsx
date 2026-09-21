import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Vijf sterren in de accentkleur, gevuld tot de score (halve ster bij ,5). */
export const RatingStars = ({ value, small = false, className }: { value: number; small?: boolean; className?: string }) => {
  const size = small ? "h-4 w-4" : "h-5 w-5";
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className={cn("inline-flex items-center", className)} aria-label={`${value.toFixed(1).replace(".", ",")} van 5 sterren`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full || (i === full && half);
        return <Star key={i} className={cn(size, filled ? "fill-sunset text-sunset" : "text-muted-foreground/40")} aria-hidden="true" />;
      })}
    </span>
  );
};
