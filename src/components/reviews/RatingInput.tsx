import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Vijf sterren om een score te kiezen (beoordelingspagina, fase 1 van
 * docs/plan-reviews-oogsten.md). Dezelfde sterren als `RatingStars`, maar
 * dan als radiogroep; de gekozen of aangewezen score staat er in woorden
 * naast. Werkt in een `FormField` (neemt id en aria-attributen over).
 */
const LABELS = ["Kies een score", "Slecht", "Matig", "Gaat wel", "Goed", "Uitstekend"];

interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  id?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export const RatingInput = ({ value, onChange, id, className, ...aria }: RatingInputProps) => {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label="Score van 1 tot 5 sterren"
      aria-invalid={aria["aria-invalid"]}
      aria-describedby={aria["aria-describedby"]}
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}
    >
      <div className="flex" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} van 5: ${LABELS[n]}`}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            className="rounded-md p-1 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 coarse:p-2"
          >
            <Star
              className={cn("h-8 w-8 transition-colors duration-fast", n <= shown ? "fill-sunset text-sunset" : "text-muted-foreground/40")}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <span className="text-sm text-muted-foreground" aria-live="polite">
        {LABELS[shown]}
      </span>
    </div>
  );
};
