import { useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { format, differenceInDays, addDays, startOfWeek, endOfWeek, isToday } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  type: string;
  program_id: string | null;
  accommodation_id: string | null;
  customer_name: string;
  customer_company: string | null;
  program_ref: string | null;
  accommodation_ref: string | null;
  selected_dates: string[];
  accommodation_arrival: string | null;
  accommodation_departure: string | null;
  quote_status: string | null;
  terms_accepted_at: string | null;
  program_status: string | null;
  accommodation_status: string | null;
  completion_status: string | null;
  item_count: number;
  items_confirmed: number;
  items_pending: number;
}

interface ProjectGanttChartProps {
  projects: Project[];
}

function getProjectDates(project: Project): { start: Date; end: Date } | null {
  const dates: Date[] = [];

  project.selected_dates.forEach((d) => {
    const date = new Date(d);
    if (!isNaN(date.getTime())) dates.push(date);
  });

  if (project.accommodation_arrival) {
    const arr = new Date(project.accommodation_arrival);
    if (!isNaN(arr.getTime())) dates.push(arr);
  }
  if (project.accommodation_departure) {
    const dep = new Date(project.accommodation_departure);
    if (!isNaN(dep.getTime())) dates.push(dep);
  }

  if (dates.length === 0) return null;

  return {
    start: new Date(Math.min(...dates.map((d) => d.getTime()))),
    end: new Date(Math.max(...dates.map((d) => d.getTime()))),
  };
}

function getStatusColor(project: Project): string {
  if (project.program_status === "cancelled" || project.accommodation_status === "cancelled")
    return "bg-red-400";
  if (project.completion_status === "completed") return "bg-emerald-400";
  if (project.terms_accepted_at) return "bg-green-400";
  if (project.quote_status === "offerte_verstuurd") return "bg-blue-400";
  if (project.quote_status === "concept") return "bg-slate-300";
  return "bg-sky-400";
}

const DAY_WIDTH = 36;

export function ProjectGanttChart({ projects }: ProjectGanttChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { timelineStart, timelineEnd, days, projectBars } = useMemo(() => {
    const allDates: Date[] = [];
    const bars: { project: Project; start: Date; end: Date }[] = [];

    projects.forEach((p) => {
      const range = getProjectDates(p);
      if (range) {
        allDates.push(range.start, range.end);
        bars.push({ project: p, ...range });
      }
    });

    if (allDates.length === 0) {
      const today = new Date();
      return {
        timelineStart: startOfWeek(today, { weekStartsOn: 1 }),
        timelineEnd: endOfWeek(addDays(today, 30), { weekStartsOn: 1 }),
        days: [] as Date[],
        projectBars: [],
      };
    }

    const minDate = startOfWeek(new Date(Math.min(...allDates.map((d) => d.getTime()))), { weekStartsOn: 1 });
    const maxDate = endOfWeek(new Date(Math.max(...allDates.map((d) => d.getTime()))), { weekStartsOn: 1 });

    // Add some padding
    const tStart = addDays(minDate, -7);
    const tEnd = addDays(maxDate, 7);
    const totalDays = differenceInDays(tEnd, tStart) + 1;

    const daysList: Date[] = [];
    for (let i = 0; i < totalDays; i++) {
      daysList.push(addDays(tStart, i));
    }

    return { timelineStart: tStart, timelineEnd: tEnd, days: daysList, projectBars: bars };
  }, [projects]);

  // Auto-scroll to today
  useEffect(() => {
    if (scrollRef.current && days.length > 0) {
      const todayIndex = days.findIndex((d) => isToday(d));
      if (todayIndex >= 0) {
        scrollRef.current.scrollLeft = Math.max(0, todayIndex * DAY_WIDTH - 200);
      }
    }
  }, [days]);

  if (projectBars.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Geen projecten met datums gevonden
      </div>
    );
  }

  // Group days by month for header
  const months: { label: string; span: number }[] = [];
  let currentMonth = "";
  days.forEach((d) => {
    const m = format(d, "MMMM yyyy", { locale: nl });
    if (m !== currentMonth) {
      months.push({ label: m, span: 1 });
      currentMonth = m;
    } else {
      months[months.length - 1].span++;
    }
  });

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="flex">
        {/* Left: project names */}
        <div className="flex-shrink-0 w-56 border-r bg-muted/30">
          {/* Header spacer */}
          <div className="h-[52px] border-b px-3 flex items-end pb-1">
            <span className="text-xs font-medium text-muted-foreground">Project</span>
          </div>
          {projectBars.map(({ project }) => (
            <div key={project.id} className="h-10 border-b px-3 flex items-center">
              <Link
                to={project.program_id ? `/admin/aanvragen/${project.program_id}` : `/admin/logies/${project.accommodation_id}`}
                className="truncate text-sm font-medium hover:text-primary transition-colors"
              >
                {project.customer_name}
              </Link>
            </div>
          ))}
        </div>

        {/* Right: timeline */}
        <div ref={scrollRef} className="overflow-x-auto flex-1">
          <div style={{ minWidth: days.length * DAY_WIDTH }}>
            {/* Month + day headers */}
            <div className="border-b">
              <div className="flex">
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="text-xs font-semibold text-muted-foreground px-1 border-r text-center capitalize"
                    style={{ width: m.span * DAY_WIDTH }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
              <div className="flex">
                {days.map((d, i) => (
                  <div
                    key={i}
                    className={cn(
                      "text-[10px] text-center border-r flex-shrink-0",
                      isToday(d) && "bg-primary/10 font-bold text-primary",
                      d.getDay() === 0 || d.getDay() === 6 ? "text-muted-foreground/50" : "text-muted-foreground"
                    )}
                    style={{ width: DAY_WIDTH }}
                  >
                    {format(d, "d")}
                  </div>
                ))}
              </div>
            </div>

            {/* Bars */}
            {projectBars.map(({ project, start, end }) => {
              const startOffset = differenceInDays(start, timelineStart);
              const duration = differenceInDays(end, start) + 1;

              // Accommodation sub-bar
              let accOffset = 0;
              let accDuration = 0;
              if (project.accommodation_arrival && project.accommodation_departure) {
                accOffset = differenceInDays(new Date(project.accommodation_arrival), timelineStart);
                accDuration = differenceInDays(new Date(project.accommodation_departure), new Date(project.accommodation_arrival)) + 1;
              }

              return (
                <div key={project.id} className="h-10 border-b relative">
                  {/* Today marker */}
                  {days.map((d, i) =>
                    isToday(d) ? (
                      <div
                        key={`today-${i}`}
                        className="absolute top-0 bottom-0 w-[1px] bg-primary/30 z-0"
                        style={{ left: i * DAY_WIDTH + DAY_WIDTH / 2 }}
                      />
                    ) : null
                  )}

                  {/* Main project bar */}
                  <Link
                    to={project.program_id ? `/admin/aanvragen/${project.program_id}` : `/admin/logies/${project.accommodation_id}`}
                    className={cn(
                      "absolute top-1.5 h-3 rounded-full z-10 hover:opacity-80 transition-opacity",
                      getStatusColor(project)
                    )}
                    style={{
                      left: startOffset * DAY_WIDTH + 2,
                      width: Math.max(duration * DAY_WIDTH - 4, 8),
                    }}
                    title={`${project.customer_name} — ${format(start, "d MMM", { locale: nl })} t/m ${format(end, "d MMM", { locale: nl })}`}
                  />

                  {/* Accommodation sub-bar */}
                  {accDuration > 0 && (
                    <div
                      className="absolute bottom-1.5 h-2 rounded-full bg-indigo-300/70 z-10"
                      style={{
                        left: accOffset * DAY_WIDTH + 2,
                        width: Math.max(accDuration * DAY_WIDTH - 4, 8),
                      }}
                      title={`Logies: ${project.accommodation_arrival} t/m ${project.accommodation_departure}`}
                    />
                  )}

                  {/* Activity dots */}
                  {project.selected_dates.map((dateStr, idx) => {
                    const dateObj = new Date(dateStr);
                    const offset = differenceInDays(dateObj, timelineStart);
                    return (
                      <div
                        key={idx}
                        className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-green-600 z-20"
                        style={{ left: offset * DAY_WIDTH + DAY_WIDTH / 2 - 3 }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t text-xs text-muted-foreground bg-muted/20">
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-full bg-slate-300 inline-block" /> Concept</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-full bg-blue-400 inline-block" /> Offerte</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-full bg-green-400 inline-block" /> AV getekend</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-full bg-emerald-400 inline-block" /> Afgerond</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-full bg-indigo-300 inline-block" /> Logies</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-600 inline-block" /> Activiteitsdatum</span>
      </div>
    </div>
  );
}
