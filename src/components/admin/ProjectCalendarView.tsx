import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  eachDayOfInterval,
} from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  type: string;
  program_id: string | null;
  accommodation_id: string | null;
  customer_name: string;
  selected_dates: string[];
  accommodation_arrival: string | null;
  accommodation_departure: string | null;
  quote_status: string | null;
  terms_accepted_at: string | null;
  program_status: string | null;
  accommodation_status: string | null;
  completion_status: string | null;
}

interface ProjectCalendarViewProps {
  projects: Project[];
}

function getChipColor(project: Project): string {
  if (project.program_status === "cancelled" || project.accommodation_status === "cancelled")
    return "bg-red-100 text-red-700 border-red-200";
  if (project.completion_status === "completed") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (project.terms_accepted_at) return "bg-green-100 text-green-700 border-green-200";
  if (project.quote_status === "offerte_verstuurd") return "bg-blue-100 text-blue-700 border-blue-200";
  if (project.quote_status === "concept") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-sky-100 text-sky-700 border-sky-200";
}

function getProjectActiveDays(project: Project): Date[] {
  const days: Date[] = [];

  project.selected_dates.forEach((d) => {
    const date = new Date(d);
    if (!isNaN(date.getTime())) days.push(date);
  });

  if (project.accommodation_arrival && project.accommodation_departure) {
    const start = new Date(project.accommodation_arrival);
    const end = new Date(project.accommodation_departure);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      eachDayOfInterval({ start, end }).forEach((d) => {
        if (!days.some((existing) => isSameDay(existing, d))) {
          days.push(d);
        }
      });
    }
  }

  return days;
}

export function ProjectCalendarView({ projects }: ProjectCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // Build map: date string -> projects active on that date
  const dayProjectMap = useMemo(() => {
    const map: Record<string, Project[]> = {};
    projects.forEach((project) => {
      const activeDays = getProjectActiveDays(project);
      activeDays.forEach((d) => {
        const key = format(d, "yyyy-MM-dd");
        if (!map[key]) map[key] = [];
        map[key].push(project);
      });
    });
    return map;
  }, [projects]);

  const weekDays = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: nl })}
        </h3>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map((d) => (
          <div key={d} className="text-xs font-medium text-muted-foreground text-center py-2 border-r last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          const key = format(day, "yyyy-MM-dd");
          const dayProjects = dayProjectMap[key] || [];
          const inMonth = isSameMonth(day, currentMonth);

          return (
            <div
              key={i}
              className={cn(
                "min-h-[80px] border-r border-b last:border-r-0 p-1",
                !inMonth && "bg-muted/20",
                isToday(day) && "bg-primary/5"
              )}
            >
              <div className={cn(
                "text-xs font-medium mb-1",
                !inMonth && "text-muted-foreground/40",
                isToday(day) && "text-primary font-bold"
              )}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayProjects.slice(0, 3).map((project) => (
                  <Link
                    key={project.id}
                    to={project.program_id ? `/admin/aanvragen/${project.program_id}` : `/admin/logies/${project.accommodation_id}`}
                    className={cn(
                      "block text-[10px] leading-tight px-1 py-0.5 rounded border truncate hover:opacity-80 transition-opacity",
                      getChipColor(project)
                    )}
                  >
                    {project.customer_name}
                  </Link>
                ))}
                {dayProjects.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{dayProjects.length - 3} meer
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
