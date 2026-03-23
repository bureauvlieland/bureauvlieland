import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format, isToday, eachDayOfInterval } from "date-fns";
import { nl } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Hotel, Activity } from "lucide-react";
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
  number_of_people: number;
  quote_status: string | null;
  terms_accepted_at: string | null;
  program_status: string | null;
  accommodation_status: string | null;
  completion_status: string | null;
}

interface ProjectDateListViewProps {
  projects: Project[];
}

interface DayEntry {
  project: Project;
  type: "activity" | "arrival" | "departure" | "stay";
}

function getStatusLabel(project: Project): { label: string; className: string } {
  if (project.program_status === "cancelled" || project.accommodation_status === "cancelled")
    return { label: "Geannuleerd", className: "bg-red-100 text-red-700" };
  if (project.completion_status === "fully_invoiced") return { label: "Afgerond", className: "bg-emerald-100 text-emerald-700" };
  if (project.terms_accepted_at) return { label: "AV getekend", className: "bg-green-100 text-green-700" };
  if (project.quote_status === "offerte_verstuurd") return { label: "Offerte", className: "bg-blue-100 text-blue-700" };
  if (project.quote_status === "concept") return { label: "Concept", className: "bg-slate-100 text-slate-600" };
  return { label: "Actief", className: "bg-sky-100 text-sky-700" };
}

export function ProjectDateListView({ projects }: ProjectDateListViewProps) {
  const groupedByDate = useMemo(() => {
    const map: Record<string, DayEntry[]> = {};

    const addEntry = (dateStr: string, entry: DayEntry) => {
      if (!map[dateStr]) map[dateStr] = [];
      // Avoid duplicates
      if (!map[dateStr].some((e) => e.project.id === entry.project.id && e.type === entry.type)) {
        map[dateStr].push(entry);
      }
    };

    projects.forEach((project) => {
      // Activity dates
      project.selected_dates.forEach((d) => {
        addEntry(d, { project, type: "activity" });
      });

      // Accommodation dates
      if (project.accommodation_arrival && project.accommodation_departure) {
        const start = new Date(project.accommodation_arrival);
        const end = new Date(project.accommodation_departure);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          addEntry(project.accommodation_arrival, { project, type: "arrival" });
          addEntry(project.accommodation_departure, { project, type: "departure" });
          // Stay days in between
          const allDays = eachDayOfInterval({ start, end });
          allDays.forEach((day) => {
            const key = format(day, "yyyy-MM-dd");
            if (key !== project.accommodation_arrival && key !== project.accommodation_departure) {
              addEntry(key, { project, type: "stay" });
            }
          });
        }
      }
    });

    // Sort by date
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .filter(([dateStr]) => {
        // Only show from 30 days ago onwards
        const d = new Date(dateStr);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        return d >= cutoff;
      });
  }, [projects]);

  if (groupedByDate.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Geen projecten met datums gevonden
      </div>
    );
  }

  const typeLabels: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    activity: { label: "Activiteit", icon: <Activity className="h-3 w-3" />, className: "bg-green-100 text-green-700" },
    arrival: { label: "Aankomst", icon: <Hotel className="h-3 w-3" />, className: "bg-indigo-100 text-indigo-700" },
    departure: { label: "Vertrek", icon: <Hotel className="h-3 w-3" />, className: "bg-amber-100 text-amber-700" },
    stay: { label: "Verblijf", icon: <Hotel className="h-3 w-3" />, className: "bg-indigo-50 text-indigo-500" },
  };

  return (
    <div className="space-y-4">
      {groupedByDate.map(([dateStr, entries]) => {
        const date = new Date(dateStr);
        const today = isToday(date);

        return (
          <div key={dateStr} className="relative">
            {today && (
              <div className="absolute -left-3 top-0 bottom-0 w-1 bg-primary rounded-full" />
            )}
            <div className={cn("mb-2", today && "pl-2")}>
              <h3 className={cn(
                "text-sm font-semibold capitalize",
                today ? "text-primary" : "text-foreground"
              )}>
                {format(date, "EEE d MMMM yyyy", { locale: nl })}
                {today && <span className="ml-2 text-xs font-normal text-primary">(vandaag)</span>}
              </h3>
            </div>
            <div className="space-y-2">
              {entries.map((entry, i) => {
                const status = getStatusLabel(entry.project);
                const typeConfig = typeLabels[entry.type];

                return (
                  <Card key={`${entry.project.id}-${entry.type}-${i}`} className="shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge variant="outline" className={cn("text-[10px] flex-shrink-0", typeConfig.className)}>
                            {typeConfig.icon}
                            <span className="ml-1">{typeConfig.label}</span>
                          </Badge>
                          <Link
                            to={entry.project.program_id ? `/admin/aanvragen/${entry.project.program_id}` : `/admin/logies/${entry.project.accommodation_id}`}
                            className="font-medium text-sm hover:text-primary truncate"
                          >
                            {entry.project.customer_name}
                          </Link>
                          {entry.project.customer_company && (
                            <span className="text-xs text-muted-foreground truncate hidden md:inline">
                              {entry.project.customer_company}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {(entry.project.program_ref || entry.project.accommodation_ref) && (
                            <code className="text-[10px] font-mono text-muted-foreground">
                              {entry.project.program_ref || entry.project.accommodation_ref}
                            </code>
                          )}
                          <Badge className={cn("text-[10px]", status.className)}>
                            {status.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {entry.project.number_of_people}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
