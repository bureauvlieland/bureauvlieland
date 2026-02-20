import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Building2,
  Shield,
  TrendingUp,
  Calendar,
  ThumbsUp,
  XCircle,
  MessageSquare,
  Clock,
  FileCheck,
  FileText,
  PlusCircle,
  CheckCircle,
  Send,
  Receipt,
  ArrowLeftRight,
  Eye,
} from "lucide-react";

type PeriodKey = "24h" | "7d";

interface ActionCount {
  action: string;
  count: number;
}

interface SummaryGroup {
  actor: "customer" | "partner" | "admin";
  total: number;
  actions: ActionCount[];
}

interface Summary {
  customer: SummaryGroup;
  partner: SummaryGroup;
  admin: SummaryGroup;
  period: PeriodKey;
}

const ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  // Customer
  customer_portal_viewed: { label: "Portaal bekeken", icon: <Eye className="h-3 w-3" /> },
  quote_opened: { label: "Offerte geopend", icon: <FileText className="h-3 w-3" /> },
  terms_accepted: { label: "Voorwaarden getekend", icon: <FileCheck className="h-3 w-3" /> },
  item_accepted: { label: "Activiteit goedgekeurd", icon: <ThumbsUp className="h-3 w-3" /> },
  counter_proposed: { label: "Tegenvoorstel gedaan", icon: <MessageSquare className="h-3 w-3" /> },
  time_changed: { label: "Tijdvoorkeur gewijzigd", icon: <Clock className="h-3 w-3" /> },
  billing_updated: { label: "Factuurgegevens ingevuld", icon: <Receipt className="h-3 w-3" /> },
  item_cancelled: { label: "Activiteit verwijderd", icon: <XCircle className="h-3 w-3" /> },
  add_activity: { label: "Activiteit toegevoegd", icon: <PlusCircle className="h-3 w-3" /> },
  program_request_submitted: { label: "Aanvraag ingediend", icon: <Send className="h-3 w-3" /> },
  // Partner
  status_changed: { label: "Status gewijzigd", icon: <CheckCircle className="h-3 w-3" /> },
  invoice_registered: { label: "Factuur geregistreerd", icon: <Receipt className="h-3 w-3" /> },
  // Admin
  quote_status_changed: { label: "Offertestatuswijziging", icon: <FileText className="h-3 w-3" /> },
  partner_invited: { label: "Partner uitgenodigd", icon: <User className="h-3 w-3" /> },
  partner_invitation_resent: { label: "Uitnodiging opnieuw verstuurd", icon: <Send className="h-3 w-3" /> },
  partner_created: { label: "Partner aangemaakt", icon: <User className="h-3 w-3" /> },
  partner_updated: { label: "Partnergegevens bijgewerkt", icon: <User className="h-3 w-3" /> },
  item_status_changed: { label: "Activiteitstatus gewijzigd", icon: <ArrowLeftRight className="h-3 w-3" /> },
  admin_sent_to_partners: { label: "Verstuurd naar partners", icon: <Send className="h-3 w-3" /> },
  quote_sent: { label: "Offerte verstuurd", icon: <Send className="h-3 w-3" /> },
  template_applied: { label: "Template toegepast", icon: <FileCheck className="h-3 w-3" /> },
  request_cancelled: { label: "Aanvraag geannuleerd", icon: <XCircle className="h-3 w-3" /> },
};

function periodLabel(period: PeriodKey) {
  return period === "24h" ? "Afgelopen 24 uur" : "Afgelopen 7 dagen";
}

function periodSince(period: PeriodKey): string {
  const ms = period === "24h" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms).toISOString();
}

function GroupCard({
  group,
  icon,
  label,
  accentClass,
}: {
  group: SummaryGroup;
  icon: React.ReactNode;
  label: string;
  accentClass: string;
}) {
  // Filter out very noisy background actions for the detail list (show them in total only)
  const displayActions = group.actions
    .filter((a) => a.action !== "customer_portal_viewed" || group.actor !== "customer")
    .slice(0, 6);

  const portalViews = group.actor === "customer"
    ? group.actions.find((a) => a.action === "customer_portal_viewed")?.count ?? 0
    : 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Group header */}
      <div className="flex items-center gap-2">
        <div className={`h-6 w-6 rounded-full flex items-center justify-center ${accentClass}`}>
          {icon}
        </div>
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <Badge variant="secondary" className="ml-auto text-xs px-2 py-0 h-5">
          {group.total}
        </Badge>
      </div>

      {/* Action breakdown */}
      {group.total === 0 ? (
        <p className="text-xs text-muted-foreground pl-8">Geen activiteit</p>
      ) : (
        <div className="space-y-1 pl-8">
          {displayActions.map((a) => {
            const meta = ACTION_LABELS[a.action];
            return (
              <div key={a.action} className="flex items-center gap-2">
                <span className="text-muted-foreground flex-shrink-0">
                  {meta?.icon ?? <ArrowLeftRight className="h-3 w-3" />}
                </span>
                <span className="text-xs text-muted-foreground flex-1 truncate">
                  {meta?.label ?? a.action}
                </span>
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {a.count}×
                </span>
              </div>
            );
          })}
          {portalViews > 0 && (
            <div className="flex items-center gap-2 opacity-50">
              <Eye className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground flex-1">Portaal bezocht</span>
              <span className="text-xs tabular-nums">{portalViews}×</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DailyActivitySummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("24h");

  useEffect(() => {
    const fetchSummary = async () => {
      setIsLoading(true);
      const since = periodSince(period);

      const [{ data: historyData }, { data: adminData }] = await Promise.all([
        supabase
          .from("program_request_history")
          .select("actor, action")
          .gte("created_at", since),
        supabase
          .from("admin_activity_log")
          .select("action")
          .gte("created_at", since)
          .not("action", "eq", "request_viewed"),
      ]);

      // Aggregate history by actor + action
      const customerCounts: Record<string, number> = {};
      const partnerCounts: Record<string, number> = {};

      for (const row of historyData || []) {
        if (row.actor === "customer") {
          customerCounts[row.action] = (customerCounts[row.action] || 0) + 1;
        } else if (row.actor === "partner") {
          partnerCounts[row.action] = (partnerCounts[row.action] || 0) + 1;
        }
      }

      const adminCounts: Record<string, number> = {};
      for (const row of adminData || []) {
        adminCounts[row.action] = (adminCounts[row.action] || 0) + 1;
      }

      const toSorted = (counts: Record<string, number>): ActionCount[] =>
        Object.entries(counts)
          .map(([action, count]) => ({ action, count }))
          .sort((a, b) => b.count - a.count);

      const customerActions = toSorted(customerCounts);
      const partnerActions = toSorted(partnerCounts);
      const adminActions = toSorted(adminCounts);

      setSummary({
        period,
        customer: {
          actor: "customer",
          total: customerActions.reduce((s, a) => s + a.count, 0),
          actions: customerActions,
        },
        partner: {
          actor: "partner",
          total: partnerActions.reduce((s, a) => s + a.count, 0),
          actions: partnerActions,
        },
        admin: {
          actor: "admin",
          total: adminActions.reduce((s, a) => s + a.count, 0),
          actions: adminActions,
        },
      });
      setIsLoading(false);
    };

    fetchSummary();
  }, [period]);

  const totalActions = summary
    ? summary.customer.total + summary.partner.total + summary.admin.total
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Activiteitsoverzicht
          </CardTitle>
          {/* Period toggle */}
          <div className="flex items-center gap-1 p-0.5 bg-muted rounded-md">
            {(["24h", "7d"] as PeriodKey[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                  period === p
                    ? "bg-background text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="h-3 w-3" />
                {p === "24h" ? "24u" : "7d"}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{periodLabel(period)} · {isLoading ? "…" : totalActions} acties</p>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            <GroupCard
              group={summary!.customer}
              icon={<User className="h-3 w-3" />}
              label="Klanten"
              accentClass="bg-blue-50 text-blue-600"
            />
            <div className="border-t" />
            <GroupCard
              group={summary!.partner}
              icon={<Building2 className="h-3 w-3" />}
              label="Partners"
              accentClass="bg-amber-50 text-amber-600"
            />
            <div className="border-t" />
            <GroupCard
              group={summary!.admin}
              icon={<Shield className="h-3 w-3" />}
              label="Admin"
              accentClass="bg-indigo-50 text-indigo-600"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
