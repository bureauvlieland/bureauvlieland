import ambassadeurLogo from "@/assets/ambassadeur-waddenzee-werelderfgoed.png";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface WaddenAmbassadeurBadgeProps {
  variant?: "compact" | "stacked" | "icon";
  withInfo?: boolean;
  className?: string;
  imgClassName?: string;
}

const INFO_TEXT =
  "Het ambassadeursprogramma Waddenzee Werelderfgoed is een initiatief van het ministerie van LNV, naar voorbeeld uit Duitsland en Denemarken. Het verbindt organisaties in het Nederlandse waddengebied die kennis hebben van de Werelderfgoed-status én duurzaam ondernemen.";

export const WaddenAmbassadeurBadge = ({
  variant = "compact",
  withInfo = true,
  className,
  imgClassName,
}: WaddenAmbassadeurBadgeProps) => {
  const content = (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-muted-foreground",
        variant === "stacked" && "flex-col gap-1 text-center",
        className,
      )}
    >
      <img
        src={ambassadeurLogo}
        alt="Trotse ambassadeur Waddenzee Werelderfgoed"
        className={cn(
          "shrink-0 object-contain",
          imgClassName ?? (variant === "stacked" ? "h-14 w-auto" : "h-10 w-auto"),
        )}
        loading="lazy"
      />
      {variant !== "icon" && (
        <span className="text-xs leading-tight text-left">
          Trotse ambassadeur
          <br />
          Waddenzee Werelderfgoed
        </span>
      )}
    </div>
  );

  if (!withInfo) return content;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-md hover:bg-muted/50 transition-colors p-1 -m-1 cursor-help"
          aria-label="Meer over Waddenzee Werelderfgoed ambassadeurschap"
        >
          {content}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm" side="top">
        <div className="space-y-2">
          <p className="font-semibold">Trotse ambassadeur Waddenzee Werelderfgoed</p>
          <p className="text-muted-foreground text-xs leading-relaxed">{INFO_TEXT}</p>
          <a
            href="https://www.waddenzeewerelderfgoed.nl/ambassadeurs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-block"
          >
            Meer over het ambassadeursprogramma →
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
};
