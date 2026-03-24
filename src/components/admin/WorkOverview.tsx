import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSettings } from "@/hooks/useAppSettings";
import {
  Briefcase,
  Clock,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Send,
  FileEdit,
  Users,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { differenceInDays, parseISO, format, addDays } from "date-fns";
import { nl } from "date-fns/locale";

type HorizonFilter = "2w" | "1m" | "all";

interface ProjectData {
  id: string;
  customer_name: string;
  customer_company: string | null;
  reference_number: string | null;
  quote_status: string | null;
  quote_valid_until: string | null;
  quote_sent_at: string | null;
  selected_dates: unknown;
  number_of_people: number;
  status: string;
  program_type: string;
  completion_status: string | null;
  created_at: string;
}

interface ItemData {
  id: string;
  request_id: string;
  status: string;
  provider_name: string;
  provider_id: string;
  block_name: string;
  skip_partner_notification: boolean | null;
  updated_at: string;
  quoted_at: string | null;
  quoted_price: number | null;
  block_type: string;
}

interface ReminderLog {
  related_request_id: string | null;
  related_item_id: string | null;
  email_type: string;
  sent_at: string | null;
  created_at: string;
}

interface AccommodationData {
  request_id: string;
  status: string;
  accommodation_name: string;
  linked_program_id: string | null;
}

interface ProjectSummary {
  project: ProjectData;
  executionDate: Date | null;
  daysUntilExecution: number | null;
  actionOwner: "admin" | "partner" | "customer" | "done";
  actionLabel: string;
  actionColor: string;
  pendingPartnerItems: number;
  totalItems: number;
  confirmedItems: number;
  nextReminder: string | null;
  lastReminder: string | null;
  quoteExpired: boolean;
  quoteExpiresIn: number | null;
  urgencyScore: number;
  accommodationStatus: string | null;
}

const HORIZON_LABELS: Record<HorizonFilter, string> = {
  "2w": "2 weken",
  "1m": "1 maand",
  all: "Alles",
};

function getExecutionDate(selectedDates: unknown): Date | null {
  if (!selectedDates) return null;
  const dates = Array.isArray(selectedDates) ? selectedDates : [];
  if (dates.length === 0) return null;
  const sorted = dates
    .map((d: string) => parseISO(d))
    .filter((d: Date) => !isNaN(d.getTime()))
    .sort((a: Date, b: Date) => a.getTime() - b.getTime());
  return sorted[0] || null;
}

function getPipelineBadge(quoteStatus: string | null, programType: string) {
  if (!quoteStatus) {
    return { label: "Actief", className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" };
  }
  const map: Record<string, { label: string; className: string }> = {
    concept: { label: "Concept", className: "bg-muted text-muted-foreground" },
    in_afstemming: { label: "In afstemming", className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
    offerte_verstuurd: { label: "Offerte verstuurd", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
    akkoord_ontvangen: { label: "Akkoord", className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" },
    definitief_bevestigd: { label: "Definitief", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
    verlopen: { label: "Verlopen", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
    geannuleerd: { label: "Geannuleerd", className: "bg-muted text-muted-foreground" },
  };
  return map[quoteStatus] || { label: quoteStatus, className: "bg-muted text-muted-foreground" };
}

export const WorkOverview = () => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [items, setItems] = useState<ItemData[]>([]);
  const [reminders, setReminders] = useState<ReminderLog[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [horizon, setHorizon] = useState<HorizonFilter>("1m");
  const { settings } = useAppSettings();

  useEffect(() => {
    const fetch = async () => {
      const [projectsRes, itemsRes, remindersRes, accomRes] = await Promise.all([
        supabase
          .from("program_requests")
          .select("id, customer_name, customer_company, reference_number, quote_status, quote_valid_until, quote_sent_at, selected_dates, number_of_people, status, program_type, completion_status, created_at")
          .eq("status", "active")
          .order("created_at", { ascending: false }),
        supabase
          .from("program_request_items")
          .select("id, request_id, status, provider_name, provider_id, block_name, skip_partner_notification, updated_at, quoted_at, quoted_price, block_type"),
        supabase
          .from("email_log")
          .select("related_request_id, related_item_id, email_type, sent_at, created_at")
          .like("email_type", "REMINDER_%")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("accommodation_quotes")
          .select("request_id, status, accommodation_name, accommodation_requests!inner(linked_program_id)")
          .in("status", ["pending", "submitted", "selected"]),
      ]);

      setProjects(projectsRes.data || []);
      setItems(itemsRes.data || []);
      setReminders(remindersRes.data || []);
      
      // Flatten accommodation data
      const accomFlat = (accomRes.data || []).map((q: any) => ({
        request_id: q.request_id,
        status: q.status,
        accommodation_name: q.accommodation_name,
        linked_program_id: (q.accommodation_requests as any)?.linked_program_id || null,
      }));
      setAccommodations(accomFlat);
      setIsLoading(false);
    };
    fetch();
  }, []);

  const summaries = useMemo(() => {
    const now = new Date();
    const partnerReminderDays = settings.reminder_days_partner_quote || 5;
    const customerReminderDays = settings.reminder_days_customer_quote || 7;

    return projects
      .filter((p) => p.completion_status !== "fully_invoiced" && p.status === "active")
      .map((project): ProjectSummary => {
        const projectItems = items.filter((i) => i.request_id === project.id);
        const executionDate = getExecutionDate(project.selected_dates);
        const daysUntilExecution = executionDate ? differenceInDays(executionDate, now) : null;

        // Items analysis
        const externalItems = projectItems.filter(
          (i) => i.provider_id !== "bureau" && !i.skip_partner_notification
        );
        const pendingPartnerItems = externalItems.filter(
          (i) => i.status === "pending"
        );
        const confirmedItems = projectItems.filter(
          (i) => i.status === "confirmed" || i.status === "accepted"
        );

        // Quote expiry
        const quoteExpired = project.quote_valid_until
          ? parseISO(project.quote_valid_until) < now
          : false;
        const quoteExpiresIn = project.quote_valid_until
          ? differenceInDays(parseISO(project.quote_valid_until), now)
          : null;

        // Accommodation
        const accom = accommodations.find((a) => a.linked_program_id === project.id);
        const accommodationStatus = accom?.status || null;

        // Determine action owner & label
        let actionOwner: ProjectSummary["actionOwner"] = "admin";
        let actionLabel = "Concept — nog niet verstuurd";
        let actionColor = "text-muted-foreground";

        if (quoteExpired && project.quote_status === "verlopen") {
          actionOwner = "admin";
          actionLabel = "Offerte verlopen";
          actionColor = "text-red-600 dark:text-red-400";
        } else if (project.quote_status === "offerte_verstuurd") {
          actionOwner = "customer";
          actionLabel = "Offerte bij klant";
          actionColor = "text-blue-600 dark:text-blue-400";
        } else if (pendingPartnerItems.length > 0) {
          actionOwner = "partner";
          actionLabel = `${pendingPartnerItems.length} item${pendingPartnerItems.length > 1 ? "s" : ""} bij partner`;
          actionColor = "text-amber-600 dark:text-amber-400";
        } else if (
          confirmedItems.length === projectItems.length &&
          projectItems.length > 0
        ) {
          actionOwner = "done";
          actionLabel = "Alles bevestigd";
          actionColor = "text-green-600 dark:text-green-400";
        } else if (project.quote_status === "akkoord_ontvangen" || project.quote_status === "definitief_bevestigd") {
          actionOwner = "admin";
          actionLabel = "Akkoord — uitvoering voorbereiden";
          actionColor = "text-green-600 dark:text-green-400";
        } else if (project.quote_status === "concept" || !project.quote_status) {
          actionOwner = "admin";
          actionLabel = projectItems.length === 0 ? "Nieuw — programma opstellen" : "Concept — nog niet verstuurd";
          actionColor = "text-muted-foreground";
        }

        // Reminder calculation
        const projectReminders = reminders.filter(
          (r) => r.related_request_id === project.id
        );
        const lastReminder = projectReminders[0]
          ? projectReminders[0].sent_at || projectReminders[0].created_at
          : null;

        let nextReminder: string | null = null;
        if (pendingPartnerItems.length > 0) {
          const oldestPending = pendingPartnerItems.reduce((oldest, item) => {
            const itemDate = parseISO(item.updated_at);
            return itemDate < parseISO(oldest.updated_at) ? item : oldest;
          });
          const daysPending = differenceInDays(now, parseISO(oldestPending.updated_at));
          const daysUntilReminder = partnerReminderDays - daysPending;
          if (daysUntilReminder > 0) {
            nextReminder = `Herinnering partner over ${daysUntilReminder}d`;
          } else {
            // Check if reminder was already sent for this item
            const itemReminder = reminders.find(
              (r) => r.related_item_id === oldestPending.id && r.email_type === "REMINDER_ITEM_PENDING"
            );
            nextReminder = itemReminder
              ? `Herinnering verstuurd ${format(parseISO(itemReminder.sent_at || itemReminder.created_at), "d MMM", { locale: nl })}`
              : `Herinnering partner te laat (${daysPending}d)`;
          }
        } else if (project.quote_status === "offerte_verstuurd" && project.quote_sent_at) {
          const daysSinceSent = differenceInDays(now, parseISO(project.quote_sent_at));
          const daysUntilReminder = customerReminderDays - daysSinceSent;
          if (daysUntilReminder > 0) {
            nextReminder = `Herinnering klant over ${daysUntilReminder}d`;
          } else {
            nextReminder = `Klant onbeantwoord (${daysSinceSent}d)`;
          }
        }

        // Urgency score
        let urgencyScore = 0;
        if (quoteExpired) urgencyScore += 100;
        if (daysUntilExecution !== null && daysUntilExecution < 14 && confirmedItems.length < projectItems.length) {
          urgencyScore += 80;
        }
        if (pendingPartnerItems.some((i) => differenceInDays(now, parseISO(i.updated_at)) > partnerReminderDays)) {
          urgencyScore += 60;
        }
        if (project.quote_status === "offerte_verstuurd" && project.quote_sent_at) {
          const daysSince = differenceInDays(now, parseISO(project.quote_sent_at));
          if (daysSince > customerReminderDays) urgencyScore += 40;
        }
        if (daysUntilExecution !== null) urgencyScore += Math.max(0, 30 - daysUntilExecution);

        return {
          project,
          executionDate,
          daysUntilExecution,
          actionOwner,
          actionLabel,
          actionColor,
          pendingPartnerItems: pendingPartnerItems.length,
          totalItems: projectItems.length,
          confirmedItems: confirmedItems.length,
          nextReminder,
          lastReminder,
          quoteExpired,
          quoteExpiresIn,
          urgencyScore,
          accommodationStatus,
        };
      })
      .filter((s) => {
        if (horizon === "all") return true;
        if (!s.executionDate) return true; // Always show projects without dates
        const cutoff = horizon === "2w" ? addDays(now, 14) : addDays(now, 30);
        return s.executionDate <= cutoff || s.urgencyScore > 50;
      })
      .sort((a, b) => b.urgencyScore - a.urgencyScore);
  }, [projects, items, reminders, accommodations, settings, horizon]);

  const actionIcon = (owner: ProjectSummary["actionOwner"]) => {
    switch (owner) {
      case "partner": return <Clock className="h-3.5 w-3.5" />;
      case "customer": return <Send className="h-3.5 w-3.5" />;
      case "done": return <CheckCircle2 className="h-3.5 w-3.5" />;
      default: return <FileEdit className="h-3.5 w-3.5" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5" />
            Werkoverzicht
            {summaries.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {summaries.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            {(Object.keys(HORIZON_LABELS) as HorizonFilter[]).map((h) => (
              <Button
                key={h}
                variant={horizon === h ? "default" : "ghost"}
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => setHorizon(h)}
              >
                {HORIZON_LABELS[h]}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {summaries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Geen actieve projecten in deze periode
          </p>
        ) : (
          <div className="space-y-2">
            {summaries.map((s) => {
              const pipelineBadge = getPipelineBadge(s.project.quote_status, s.project.program_type);
              const isUrgent = s.urgencyScore >= 60;

              return (
                <Link
                  key={s.project.id}
                  to={`/admin/aanvragen/${s.project.id}`}
                  className={`block p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                    isUrgent ? "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20" : ""
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm truncate text-foreground">
                        {s.project.customer_company || s.project.customer_name}
                      </span>
                      {s.project.reference_number && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {s.project.reference_number}
                        </span>
                      )}
                      <Badge className={`text-[10px] px-1.5 py-0 ${pipelineBadge.className}`} variant="secondary">
                        {pipelineBadge.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {s.executionDate && (
                        <span className={`flex items-center gap-1 text-xs ${
                          s.daysUntilExecution !== null && s.daysUntilExecution < 14 && s.confirmedItems < s.totalItems
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : "text-muted-foreground"
                        }`}>
                          <CalendarDays className="h-3 w-3" />
                          {format(s.executionDate, "d MMM", { locale: nl })}
                          {s.daysUntilExecution !== null && s.daysUntilExecution >= 0 && (
                            <span className="text-[10px]">({s.daysUntilExecution}d)</span>
                          )}
                        </span>
                      )}
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Status row */}
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    {/* Action owner */}
                    <span className={`flex items-center gap-1 font-medium ${s.actionColor}`}>
                      {actionIcon(s.actionOwner)}
                      {s.actionLabel}
                    </span>

                    {/* Progress */}
                    {s.totalItems > 0 && (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {s.confirmedItems}/{s.totalItems} bevestigd
                      </span>
                    )}

                    {/* Quote expiry warning */}
                    {s.quoteExpired && (
                      <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-3 w-3" />
                        Offerte verlopen
                      </span>
                    )}
                    {!s.quoteExpired && s.quoteExpiresIn !== null && s.quoteExpiresIn <= 7 && s.quoteExpiresIn > 0 && (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        Verloopt over {s.quoteExpiresIn}d
                      </span>
                    )}

                    {/* Reminder info */}
                    {s.nextReminder && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {s.nextReminder}
                      </span>
                    )}

                    {/* Accommodation */}
                    {s.accommodationStatus && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        s.accommodationStatus === "selected"
                          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                      }`}>
                        Logies: {s.accommodationStatus === "selected" ? "gekozen" : s.accommodationStatus === "submitted" ? "offerte" : "afwachting"}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
