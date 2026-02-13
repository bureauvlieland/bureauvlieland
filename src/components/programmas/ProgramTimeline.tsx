import { Clock, Users } from "lucide-react";
import type { ProgramTemplate, ProgramTemplateItem } from "@/types/programTemplate";
import { getBlockImage } from "@/lib/buildingBlockUtils";

interface ProgramTimelineProps {
  template: ProgramTemplate;
}

const dayLabels = ["Dag 1", "Dag 2", "Dag 3", "Dag 4", "Dag 5"];

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
      if (a.preferred_time && b.preferred_time) {
        return a.preferred_time.localeCompare(b.preferred_time);
      }
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  });

  const days = Object.keys(itemsByDay)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-10">
      {days.map((dayIndex) => (
        <div key={dayIndex}>
          {/* Day header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary text-primary-foreground font-bold px-4 py-1.5 rounded-lg text-base">
              {dayLabels[dayIndex] || `Dag ${dayIndex + 1}`}
            </div>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Timeline items */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[1.15rem] md:left-[4.5rem] top-0 bottom-0 w-px bg-border" />

            <div className="space-y-1">
              {itemsByDay[dayIndex].map((item, idx) => {
                const block = item.block;
                const image = block ? getBlockImage(block) : "/placeholder.svg";
                const hasImage = image !== "/placeholder.svg";

                return (
                  <div key={item.id} className="relative flex items-start gap-3 md:gap-4 py-2">
                    {/* Time column - visible on md+ */}
                    <div className="hidden md:flex w-[4rem] shrink-0 justify-end pt-1">
                      {item.preferred_time && (
                        <span className="text-sm font-semibold text-primary tabular-nums">
                          {item.preferred_time}
                        </span>
                      )}
                    </div>

                    {/* Dot */}
                    <div className="shrink-0 mt-2">
                      <div className="w-3 h-3 rounded-full bg-primary border-2 border-background shadow-sm" />
                    </div>

                    {/* Card */}
                    <div className="flex-1 flex gap-3 bg-card rounded-lg border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow min-w-0">
                      {hasImage && (
                        <div className="w-20 sm:w-24 md:w-32 shrink-0">
                          <img
                            src={image}
                            alt={block?.name || item.block_id}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="flex-1 py-3 px-3 sm:px-4 min-w-0">
                        {/* Mobile time */}
                        {item.preferred_time && (
                          <span className="md:hidden inline-flex items-center gap-1 text-xs font-bold text-primary mb-1">
                            <Clock className="h-3 w-3" />
                            {item.preferred_time}
                          </span>
                        )}
                        <h4 className="font-semibold text-foreground text-sm md:text-base leading-tight">
                          {block?.name || item.block_id}
                        </h4>
                        {block?.short_description && (
                          <p className="text-muted-foreground text-xs md:text-sm mt-0.5 line-clamp-2">
                            {block.short_description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {block?.duration && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {block.duration}
                            </span>
                          )}
                          {block?.min_people && block?.max_people && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {block.min_people}–{block.max_people} pers.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
