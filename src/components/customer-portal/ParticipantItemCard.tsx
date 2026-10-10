import { Clock, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTimeHHmm } from "@/lib/timeUtils";
import { getBlockImage } from "@/lib/buildingBlockUtils";
import { resolveCustomerItemDescription } from "@/lib/customerItemDescription";
import { presentProvider, itemLocationLine } from "@/lib/providerPresentation";
import { transformImageUrl } from "@/lib/supabaseImage";
import type { ProgramRequestItem } from "@/types/programRequest";

interface ParticipantItemCardProps {
  item: ProgramRequestItem;
  numberOfPeople?: number;
  /** Dit onderdeel is nu bezig of net geweest (evenementmodus). */
  state?: "upcoming" | "active" | "past";
}

/** Waar de route naartoe gaat: coördinaten als ze er zijn, anders het adres. */
const routeUrlForItem = (item: ProgramRequestItem): string | null => {
  if (item.location_lat && item.location_lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${item.location_lat},${item.location_lng}`;
  }
  if (item.location_address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.location_address)}`;
  }
  return null;
};

/**
 * De onderdeelkaart voor deelnemers (klantportaal fase 3c): dezelfde opbouw
 * als `ProgramItemCard` (tijd links op desktop, bovenaan op een telefoon,
 * titel die doorloopt, één regel aanbieder en plek), maar zonder status,
 * prijs en acties. Alleen de route en de uitleg onder "Details".
 */
export const ParticipantItemCard = ({ item, numberOfPeople, state = "upcoming" }: ParticipantItemCardProps) => {
  const time = formatTimeHHmm(item.confirmed_time || item.proposed_time || item.preferred_time);
  const timeKind = item.confirmed_time ? "bevestigd" : item.proposed_time ? "voorstel" : item.preferred_time ? "gewenst" : "flexibel";
  const isSelfArranged = item.block_type === "self_arranged";
  const provider = isSelfArranged || item.provider_id === "bureau" ? null : presentProvider(item.provider_profile);
  const locationLine = itemLocationLine(item, provider);
  const thumbnailSrc = getBlockImage({ image_url: item.image_url, image_asset: item.image_asset } as never);
  const description = resolveCustomerItemDescription(item as never);
  const routeUrl = routeUrlForItem(item);
  const meta = [
    isSelfArranged ? "Zelf te boeken" : item.provider_name,
    item.duration,
    item.override_people || numberOfPeople ? `${item.override_people ?? numberOfPeople} pers.` : null,
  ].filter(Boolean) as string[];

  return (
    <article
      id={`onderdeel-${item.id}`}
      className={cn(
        "scroll-mt-32 rounded-lg border bg-card p-4 transition-colors duration-base",
        state === "active" && "border-primary/40 bg-accent-soft/40",
        state === "past" && "opacity-60",
      )}
    >
      <div className="flex gap-4">
        <div className="hidden w-16 shrink-0 flex-col items-end pt-0.5 text-right sm:flex">
          <span className={cn("text-base font-semibold tabular-nums", time ? "text-primary" : "text-muted-foreground")}>{time ?? "flex."}</span>
          <span className="text-[11px] leading-tight text-muted-foreground">{timeKind}</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-1 flex items-center gap-1.5 text-sm sm:hidden">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span className={cn("font-semibold tabular-nums", time ? "text-primary" : "text-muted-foreground")}>{time ?? "Flexibel"}</span>
            <span className="text-muted-foreground">· {timeKind}</span>
          </p>

          <div className="flex items-start gap-3">
            {thumbnailSrc && thumbnailSrc !== "/placeholder.svg" && (
              <img src={transformImageUrl(thumbnailSrc, { width: 240 })} alt="" className="hidden h-16 w-16 shrink-0 rounded-lg object-cover sm:block" loading="lazy" />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-base font-medium leading-snug text-foreground">{item.block_name}</h3>
              {meta.length > 0 && <p className="mt-1 text-sm text-muted-foreground">{meta.join(" · ")}</p>}
              {locationLine && (
                <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{locationLine}</span>
                </p>
              )}
              {(routeUrl || description) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {routeUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={routeUrl} target="_blank" rel="noreferrer">
                        <Navigation className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        Route
                      </a>
                    </Button>
                  )}
                  {description && (
                    <details className="group min-w-0 flex-1">
                      <summary className="cursor-pointer list-none text-sm font-medium text-primary hover:underline [&::-webkit-details-marker]:hidden">
                        <span className="group-open:hidden">Details</span>
                        <span className="hidden group-open:inline">Minder</span>
                      </summary>
                      <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{description}</p>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
