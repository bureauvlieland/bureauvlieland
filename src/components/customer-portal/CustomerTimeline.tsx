import type { ProgramRequestItem } from "@/types/programRequest";

/** Sort items chronologically: confirmed_time > proposed_time > preferred_time */
export const sortItemsByTime = (items: ProgramRequestItem[]): ProgramRequestItem[] => {
  return [...items].sort((a, b) => {
    const timeA = a.confirmed_time || a.proposed_time || a.preferred_time;
    const timeB = b.confirmed_time || b.proposed_time || b.preferred_time;
    if (!timeA && !timeB) return 0;
    if (!timeA) return 1;
    if (!timeB) return -1;
    return timeA.localeCompare(timeB);
  });
};

interface CustomerTimelineProps {
  items: ProgramRequestItem[];
  showTimeColumn?: boolean;
  children: (item: ProgramRequestItem) => React.ReactNode;
}

export const CustomerTimeline = ({ items, showTimeColumn = false, children }: CustomerTimelineProps) => {
  const sorted = sortItemsByTime(items);

  const lineLeft = showTimeColumn ? "left-[4.5rem]" : "left-[1.15rem]";

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className={`absolute ${lineLeft} top-0 bottom-0 w-px bg-border`} />
      <div className="space-y-1">
        {sorted.map((item) => {
          const displayTime = item.confirmed_time || item.proposed_time || item.preferred_time;
          return (
            <div key={item.id} className={`relative flex items-start ${showTimeColumn ? "gap-4" : "gap-3"} py-2`}>
              {/* Time column - desktop only */}
              {showTimeColumn && (
                <div className="w-[4rem] shrink-0 flex justify-end pt-3">
                  {displayTime && displayTime !== "flexibel" && (
                    <span className="text-sm font-semibold text-primary tabular-nums">
                      {displayTime}
                    </span>
                  )}
                </div>
              )}
              {/* Dot */}
              <div className={`shrink-0 mt-3.5 ${showTimeColumn ? "" : "z-10"}`}>
                <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-background shadow-sm" />
              </div>
              {/* Card */}
              <div className="flex-1 min-w-0">
                {children(item)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
