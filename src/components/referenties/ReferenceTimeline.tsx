import { Clock } from "lucide-react";
import { Pill } from "@/components/system";
import { dayDateLabel, type ReferenceProgramDay } from "@/lib/referenceCases";
import { transformImageUrl } from "@/lib/supabaseImage";
import { categoryLabels, type BuildingBlockCategory } from "@/types/buildingBlock";

/**
 * De dagindeling van een referentiepagina: per dag een tijdlijn van de
 * onderdelen zoals de groep ze deed, met de foto van de bouwsteen. Zelfde
 * beeld als de tijdlijn van een voorbeeldprogramma, maar uit de
 * momentopname in plaats van uit een sjabloon.
 */
interface ReferenceTimelineProps {
  program: ReferenceProgramDay[];
}

const categoryLabel = (category: string): string => categoryLabels[category as BuildingBlockCategory] ?? "";

export const ReferenceTimeline = ({ program }: ReferenceTimelineProps) => {
  const days = program.filter((d) => d.items.length > 0);
  if (days.length === 0) return null;

  return (
    <div className="space-y-12">
      {days.map((day) => {
        const datum = dayDateLabel(day.date);
        return (
          <section key={day.day_index} aria-label={day.label}>
            <div className="mb-6 flex items-center gap-4">
              <h3 className="font-display text-display-md font-medium text-foreground">{day.label}</h3>
              {datum && <span className="text-sm text-muted-foreground">{datum}</span>}
              <div className="h-px flex-1 bg-border" aria-hidden="true" />
            </div>

            <ol className="relative space-y-3">
              <div className="absolute bottom-0 left-[0.3rem] top-0 w-px bg-border md:left-[4.55rem]" aria-hidden="true" />
              {day.items.map((item, index) => {
                const label = categoryLabel(item.category);
                return (
                  <li key={`${item.block_id ?? item.name}-${index}`} className="relative flex items-start gap-4">
                    <div className="hidden w-16 shrink-0 justify-end pt-3 md:flex">
                      {item.time && <span className="text-sm font-medium tabular-nums text-primary">{item.time}</span>}
                    </div>
                    <div className="mt-4 h-2.5 w-2.5 shrink-0 rounded-full bg-primary ring-2 ring-background" aria-hidden="true" />
                    <div className="flex min-w-0 flex-1 gap-3 overflow-hidden rounded-lg border border-border bg-card">
                      {item.image_url && (
                        <div className="w-20 shrink-0 sm:w-24 md:w-32">
                          <img src={transformImageUrl(item.image_url, { width: 320, quality: 70 })} alt="" className="h-full w-full object-cover" loading="lazy" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 px-3 py-3 sm:px-4">
                        {item.time && (
                          <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-primary md:hidden">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {item.time}
                          </span>
                        )}
                        <h4 className="text-sm font-medium leading-tight text-foreground md:text-base">{item.name}</h4>
                        {(label || item.provider) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            {label && <Pill tone="neutral">{label}</Pill>}
                            {item.provider && item.provider !== "Bureau Vlieland" && <span className="text-xs text-muted-foreground">door {item.provider}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
};
