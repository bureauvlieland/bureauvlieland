import { Clock, Users } from "lucide-react";
import type { ProgramTemplate, ProgramTemplateItem } from "@/types/programTemplate";
import { getBlockImage } from "@/lib/buildingBlockUtils";

interface ProgramTimelineProps {
  template: ProgramTemplate;
}

const dayLabels = ["Dag 1", "Dag 2", "Dag 3", "Dag 4", "Dag 5"];

/** De dagindeling van een voorbeeldprogramma: per dag een tijdlijn van onderdelen. */
export const ProgramTimeline = ({ template }: ProgramTimelineProps) => {
  if (!template.items || template.items.length === 0) return null;

  const itemsByDay: Record<number, ProgramTemplateItem[]> = {};
  template.items.forEach((item) => {
    const day = item.day_index || 0;
    if (!itemsByDay[day]) itemsByDay[day] = [];
    itemsByDay[day].push(item);
  });

  Object.keys(itemsByDay).forEach((day) => {
    itemsByDay[Number(day)].sort((a, b) => {
      // Onderdelen met een tijd gaan vóór onderdelen zonder tijd.
      const aHas = Boolean(a.preferred_time);
      const bHas = Boolean(b.preferred_time);
      if (aHas && bHas) return a.preferred_time!.localeCompare(b.preferred_time!);
      if (aHas) return -1;
      if (bHas) return 1;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  });

  const days = Object.keys(itemsByDay)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-12">
      {days.map((dayIndex) => (
        <section key={dayIndex} aria-label={dayLabels[dayIndex] || `Dag ${dayIndex + 1}`}>
          <div className="mb-6 flex items-center gap-4">
            <h3 className="font-display text-display-md font-medium text-foreground">{dayLabels[dayIndex] || `Dag ${dayIndex + 1}`}</h3>
            <div className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>

          <ol className="relative space-y-3">
            <div className="absolute bottom-0 left-[0.3rem] top-0 w-px bg-border md:left-[4.55rem]" aria-hidden="true" />
            {itemsByDay[dayIndex].map((item) => {
              const block = item.block;
              const image = block ? getBlockImage(block) : "/placeholder.svg";
              const hasImage = image !== "/placeholder.svg";

              return (
                <li key={item.id} className="relative flex items-start gap-4">
                  <div className="hidden w-16 shrink-0 justify-end pt-3 md:flex">
                    {item.preferred_time && <span className="text-sm font-medium tabular-nums text-primary">{item.preferred_time}</span>}
                  </div>
                  <div className="mt-4 h-2.5 w-2.5 shrink-0 rounded-full bg-primary ring-2 ring-background" aria-hidden="true" />
                  <div className="flex min-w-0 flex-1 gap-3 overflow-hidden rounded-lg border border-border bg-card">
                    {hasImage && (
                      <div className="w-20 shrink-0 sm:w-24 md:w-32">
                        <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 px-3 py-3 sm:px-4">
                      {item.preferred_time && (
                        <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-primary md:hidden">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {item.preferred_time}
                        </span>
                      )}
                      <h4 className="text-sm font-medium leading-tight text-foreground md:text-base">{block?.name || item.block_id}</h4>
                      {block?.short_description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground md:text-sm">{block.short_description}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-3">
                        {block?.duration && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {block.duration}
                          </span>
                        )}
                        {block?.min_people && block?.max_people && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" aria-hidden="true" />
                            {block.min_people} tot {block.max_people} personen
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
};
