import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarOff,
  Receipt,
  Mail,
  ExternalLink,
  Settings,
  AlertTriangle,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  date: string;
  type: "request" | "status_change" | "unavailability" | "invoice" | "activity_log" | "email";
  title: string;
  description?: string;
  status?: string;
  link?: string;
}

interface Props {
  partnerId: string;
}

export function AdminPartnerTimeline({ partnerId }: Props) {
  // Fetch activity items for the partner
  const { data: items = [] } = useQuery({
    queryKey: ["partner-timeline-items", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_request_items")
        .select(`
          id,
          block_name,
          status,
          status_updated_at,
          created_at,
          request_id,
          invoiced_date,
          invoiced_amount
        `)
        .eq("provider_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch unavailability periods
  const { data: unavailabilityPeriods = [] } = useQuery({
    queryKey: ["partner-timeline-unavailability", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_unavailability")
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch admin activity log for this partner
  const { data: activityLogs = [] } = useQuery({
    queryKey: ["partner-timeline-logs", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_activity_log")
        .select("*")
        .eq("entity_type", "partner")
        .eq("entity_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch email logs for this partner
  const { data: emailLogs = [] } = useQuery({
    queryKey: ["partner-timeline-emails", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_log")
        .select("*")
        .eq("related_partner_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = !items && !unavailabilityPeriods && !activityLogs;

  // Combine all events into a single timeline
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];

    // Add item events
    items.forEach((item) => {
      // Item created
      events.push({
        id: `item-created-${item.id}`,
        date: item.created_at,
        type: "request",
        title: `Activiteit toegevoegd: ${item.block_name}`,
        status: item.status,
        link: `/admin/aanvragen/${item.request_id}`,
      });

      // Status change
      if (item.status_updated_at && item.status_updated_at !== item.created_at) {
        events.push({
          id: `item-status-${item.id}`,
          date: item.status_updated_at,
          type: "status_change",
          title: `Status gewijzigd: ${item.block_name}`,
          description: `Nieuwe status: ${item.status}`,
          status: item.status,
        });
      }

      // Invoiced
      if (item.invoiced_date) {
        events.push({
          id: `item-invoice-${item.id}`,
          date: item.invoiced_date,
          type: "invoice",
          title: `Gefactureerd: ${item.block_name}`,
          description: item.invoiced_amount ? `€${item.invoiced_amount.toFixed(2)}` : undefined,
        });
      }
    });

    // Add unavailability events
    unavailabilityPeriods.forEach((period) => {
      events.push({
        id: `unavailability-${period.id}`,
        date: period.created_at,
        type: "unavailability",
        title: "Beschikbaarheidsblokkering toegevoegd",
        description: `${format(new Date(period.start_date), "d MMM", { locale: nl })} - ${format(new Date(period.end_date), "d MMM yyyy", { locale: nl })}${period.reason ? `: ${period.reason}` : ""}`,
      });
    });

    // Add activity log events
    activityLogs.forEach((log) => {
      const actionLabels: Record<string, string> = {
        partner_created: "Partner aangemaakt",
        partner_updated: "Partner gegevens bijgewerkt",
        partner_activated: "Partner geactiveerd",
        partner_deactivated: "Partner gedeactiveerd",
        partner_invited: "Uitnodiging verstuurd",
        unavailability_created: "Beschikbaarheidsblokkering toegevoegd",
        unavailability_updated: "Beschikbaarheidsblokkering bijgewerkt",
        unavailability_deleted: "Beschikbaarheidsblokkering verwijderd",
      };

      events.push({
        id: `log-${log.id}`,
        date: log.created_at,
        type: "activity_log",
        title: actionLabels[log.action] || log.action.replace(/_/g, " "),
        description: log.details ? JSON.stringify(log.details).substring(0, 100) : undefined,
      });
    });

    // Add email events
    emailLogs.forEach((email) => {
      events.push({
        id: `email-${email.id}`,
        date: email.created_at,
        type: "email",
        title: `Email: ${email.subject}`,
        description: email.status === "sent" ? "Verzonden" : email.status === "failed" ? "Mislukt" : email.status,
      });
    });

    // Sort by date descending
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return events;
  }, [items, unavailabilityPeriods, activityLogs, emailLogs]);

  const getEventIcon = (type: TimelineEvent["type"], status?: string) => {
    switch (type) {
      case "request":
        return <FileText className="h-4 w-4" />;
      case "status_change":
        if (status === "confirmed" || status === "accepted" || status === "executed") {
          return <CheckCircle2 className="h-4 w-4 text-green-600" />;
        } else if (status === "cancelled" || status === "declined") {
          return <XCircle className="h-4 w-4 text-red-600" />;
        }
        return <Clock className="h-4 w-4 text-amber-600" />;
      case "unavailability":
        return <CalendarOff className="h-4 w-4 text-amber-600" />;
      case "invoice":
        return <Receipt className="h-4 w-4 text-green-600" />;
      case "email":
        return <Mail className="h-4 w-4 text-blue-600" />;
      case "activity_log":
        return <Settings className="h-4 w-4 text-slate-600" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "request":
        return "bg-blue-100";
      case "status_change":
        return "bg-amber-100";
      case "unavailability":
        return "bg-orange-100";
      case "invoice":
        return "bg-green-100";
      case "email":
        return "bg-purple-100";
      case "activity_log":
        return "bg-slate-100";
      default:
        return "bg-slate-100";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Activiteit Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : timelineEvents.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p>Nog geen activiteiten voor deze partner</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="relative p-6">
              {/* Vertical line */}
              <div className="absolute left-10 top-6 bottom-6 w-px bg-slate-200" />

              <div className="space-y-4">
                {timelineEvents.map((event) => (
                  <div key={event.id} className="flex gap-4 relative">
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10 ${getEventColor(event.type)}`}
                    >
                      {getEventIcon(event.type, event.status)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {event.title}
                          </p>
                          {event.description && (
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {event.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-slate-400">
                            {format(new Date(event.date), "d MMM HH:mm", { locale: nl })}
                          </span>
                          {event.link && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                              <Link to={event.link}>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
