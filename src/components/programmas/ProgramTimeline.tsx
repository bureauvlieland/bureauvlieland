import { Clock, MapPin, Users } from "lucide-react";
import type { ProgramTemplate, ProgramTemplateItem } from "@/types/programTemplate";
import { getBlockImage } from "@/lib/buildingBlockUtils";

interface ProgramTimelineProps {
  template: ProgramTemplate;
}

const dayLabels = ["Dag 1", "Dag 2", "Dag 3", "Dag 4", "Dag 5"];

export const ProgramTimeline = ({ template }: ProgramTimelineProps) => {
  if (!template.items || template.items.length === 0) return null;

  // Group items by day_index
  const itemsByDay: Record<number, ProgramTemplateItem[]> = {};
  template.items.forEach((item) => {
    const day = item.day_index || 0;
    if (!itemsByDay[day]) itemsByDay[day] = [];
    itemsByDay[day].push(item);
  });

  // Sort each day by preferred_time, fallback sort_order
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
    <div className="space-y-12">
      {days.map((dayIndex) => (
        <div key={dayIndex}>
          {/* Day header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-primary text-primary-foreground font-bold px-4 py-2 rounded-lg text-lg">
              {dayLabels[dayIndex] || `Dag ${dayIndex + 1}`}
            </div>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Timeline items */}
          <div className="relative">
            {/* Vertical line - hidden on mobile */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2" />

            <div className="space-y-8 md:space-y-12">
              {itemsByDay[dayIndex].map((item, idx) => {
                const isLeft = idx % 2 === 0;
                const block = item.block;
                const image = block ? getBlockImage(block) : "/placeholder.svg";

                return (
                  <div
                    key={item.id}
                    className="relative flex flex-col md:flex-row items-start md:items-center gap-4"
                  >
                    {/* Mobile layout: linear */}
                    <div className="md:hidden flex gap-4 w-full">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-4 h-4 rounded-full bg-primary border-4 border-background shadow-sm mt-1" />
                        {idx < itemsByDay[dayIndex].length - 1 && (
                          <div className="w-px flex-1 bg-border min-h-[2rem]" />
                        )}
                      </div>

                      {/* Content card */}
                      <div className="flex-1 bg-card rounded-lg border border-border shadow-sm overflow-hidden mb-2">
                        {image !== "/placeholder.svg" && (
                          <div className="relative h-40 overflow-hidden">
                            <img
                              src={image}
                              alt={block?.name || item.block_id}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                            {item.preferred_time && (
                              <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {item.preferred_time}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="p-4">
                          {!image || image === "/placeholder.svg" ? (
                            item.preferred_time && (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-primary mb-2">
                                <Clock className="h-3.5 w-3.5" />
                                {item.preferred_time}
                              </span>
                            )
                          ) : null}
                          <h4 className="font-semibold text-foreground text-lg">
                            {block?.name || item.block_id}
                          </h4>
                          {block?.short_description && (
                            <p className="text-muted-foreground text-sm mt-1">
                              {block.short_description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-3 mt-3">
                            {block?.duration && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                <Clock className="h-3 w-3" />
                                {block.duration}
                              </span>
                            )}
                            {block?.min_people && block?.max_people && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                <Users className="h-3 w-3" />
                                {block.min_people}–{block.max_people} pers.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop layout: alternating left/right */}
                    <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr] w-full items-center gap-6">
                      {/* Left column */}
                      <div className={isLeft ? "" : "order-3"}>
                        <div
                          className={`bg-card rounded-lg border border-border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                            isLeft ? "ml-auto mr-0" : "mr-auto ml-0"
                          } max-w-md`}
                        >
                          {image !== "/placeholder.svg" && (
                            <div className="relative h-48 overflow-hidden">
                              <img
                                src={image}
                                alt={block?.name || item.block_id}
                                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                              {item.preferred_time && (
                                <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {item.preferred_time}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="p-5">
                            {(!image || image === "/placeholder.svg") &&
                              item.preferred_time && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-primary mb-2">
                                  <Clock className="h-3.5 w-3.5" />
                                  {item.preferred_time}
                                </span>
                              )}
                            <h4 className="font-semibold text-foreground text-lg">
                              {block?.name || item.block_id}
                            </h4>
                            {block?.short_description && (
                              <p className="text-muted-foreground text-sm mt-1">
                                {block.short_description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-3 mt-3">
                              {block?.duration && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                  <Clock className="h-3 w-3" />
                                  {block.duration}
                                </span>
                              )}
                              {block?.min_people && block?.max_people && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                  <Users className="h-3 w-3" />
                                  {block.min_people}–{block.max_people} pers.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Center dot */}
                      <div className="order-2 flex flex-col items-center">
                        <div className="w-5 h-5 rounded-full bg-primary border-4 border-background shadow-md z-10" />
                      </div>

                      {/* Right column (empty for spacing) */}
                      <div className={isLeft ? "order-3" : ""} />
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
