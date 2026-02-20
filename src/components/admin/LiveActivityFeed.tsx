import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye,
  FileCheck,
  ThumbsUp,
  MessageSquare,
  Clock,
  Receipt,
  CheckCircle,
  XCircle,
  ArrowLeftRight,
  PlayCircle,
  FileText,
  UserPlus,
  Activity,
  Building2,
  User,
  Shield,
} from "lucide-react";

type FeedFilter = "all" | "customer" | "partner" | "admin";

interface FeedItem {
  id: string;
  actor: "customer" | "partner" | "admin";
  action: string;
  new_value?: Record<string, unknown> | null;
  actor_name?: string | null;
  notes?: string | null;
  created_at: string;
  // From program_request_history
  request_id?: string;
  customer_name?: string | null;
  customer_company?: string | null;
  reference_number?: string | null;
  // From admin_activity_log
  entity_id?: string | null;
  entity_type?: string | null;
  details?: Record<string, unknown> | null;
}

function getActionMeta(item: FeedItem): { label: string; icon: React.ReactNode; color: string } {
  const { action, actor, new_value } = item;

  if (actor === "customer") {
    switch (action) {
      case "customer_portal_viewed":
        return { label: "Klant heeft portaal bekeken", icon: <Eye className="h-4 w-4" />, color: "text-blue-600 bg-blue-50" };
      case "terms_accepted":
        return { label: "Klant heeft voorwaarden ondertekend", icon: <FileCheck className="h-4 w-4" />, color: "text-green-600 bg-green-50" };
      case "item_accepted":
        return { label: "Klant heeft activiteit goedgekeurd", icon: <ThumbsUp className="h-4 w-4" />, color: "text-green-600 bg-green-50" };
      case "counter_proposed":
        return { label: "Klant doet tegenvoorstel", icon: <MessageSquare className="h-4 w-4" />, color: "text-amber-600 bg-amber-50" };
      case "time_changed":
        return { label: "Klant wijzigt tijdvoorkeur", icon: <Clock className="h-4 w-4" />, color: "text-amber-600 bg-amber-50" };
      case "billing_updated":
        return { label: "Klant heeft factuurgegevens ingevuld", icon: <Receipt className="h-4 w-4" />, color: "text-blue-600 bg-blue-50" };
      case "item_cancelled":
        return { label: "Klant heeft activiteit verwijderd", icon: <XCircle className="h-4 w-4" />, color: "text-red-600 bg-red-50" };
      default:
        return { label: action, icon: <Activity className="h-4 w-4" />, color: "text-slate-600 bg-slate-50" };
    }
  }

  if (actor === "partner") {
    const newStatus = (new_value as any)?.status;
    switch (action) {
      case "status_changed":
        if (newStatus === "confirmed")
          return { label: "Partner bevestigt activiteit", icon: <CheckCircle className="h-4 w-4" />, color: "text-green-600 bg-green-50" };
        if (newStatus === "unavailable")
          return { label: "Partner meldt niet beschikbaar", icon: <XCircle className="h-4 w-4" />, color: "text-red-600 bg-red-50" };
        if (newStatus === "alternative")
          return { label: "Partner stelt alternatief voor", icon: <ArrowLeftRight className="h-4 w-4" />, color: "text-amber-600 bg-amber-50" };
        if (newStatus === "executed")
          return { label: "Partner markeert als uitgevoerd", icon: <PlayCircle className="h-4 w-4" />, color: "text-purple-600 bg-purple-50" };
        return { label: "Partner wijzigt status", icon: <Activity className="h-4 w-4" />, color: "text-slate-600 bg-slate-50" };
      default:
        return { label: action, icon: <Activity className="h-4 w-4" />, color: "text-slate-600 bg-slate-50" };
    }
  }

  if (actor === "admin") {
    switch (action) {
      case "quote_status_changed":
        return { label: "Offertestatuswijziging", icon: <FileText className="h-4 w-4" />, color: "text-indigo-600 bg-indigo-50" };
      case "partner_invited":
        return { label: "Partner uitgenodigd", icon: <UserPlus className="h-4 w-4" />, color: "text-indigo-600 bg-indigo-50" };
      case "item_status_changed":
        return { label: "Admin wijzigt itemstatus", icon: <Activity className="h-4 w-4" />, color: "text-indigo-600 bg-indigo-50" };
      default:
        return { label: action, icon: <Activity className="h-4 w-4" />, color: "text-indigo-600 bg-indigo-50" };
    }
  }

  return { label: action, icon: <Activity className="h-4 w-4" />, color: "text-slate-600 bg-slate-50" };
}

function ActorIcon({ actor }: { actor: FeedItem["actor"] }) {
  if (actor === "customer") return <User className="h-3 w-3 text-blue-500" />;
  if (actor === "partner") return <Building2 className="h-3 w-3 text-amber-500" />;
  return <Shield className="h-3 w-3 text-indigo-500" />;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "zojuist";
  if (minutes < 60) return `${minutes} min geleden`;
  if (hours < 24) return `${hours} uur geleden`;
  if (days === 1) return "gisteren";
  return `${days} dagen geleden`;
}

export function LiveActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FeedFilter>("all");

  useEffect(() => {
    const fetchFeed = async () => {
      setIsLoading(true);
      try {
        // Query 1: program_request_history (customer + partner actions)
        const { data: historyData } = await supabase
          .from("program_request_history")
          .select(`
            id,
            request_id,
            action,
            actor,
            actor_name,
            notes,
            new_value,
            created_at,
            program_requests!inner(
              customer_name,
              customer_company,
              reference_number
            )
          `)
          .in("actor", ["customer", "partner"])
          .order("created_at", { ascending: false })
          .limit(40);

        // Query 2: admin_activity_log (filtered)
        const { data: adminData } = await supabase
          .from("admin_activity_log")
          .select("id, action, entity_id, entity_type, details, created_at")
          .not("action", "eq", "request_viewed")
          .order("created_at", { ascending: false })
          .limit(20);

        const historyItems: FeedItem[] = (historyData || []).map((h: any) => ({
          id: `h-${h.id}`,
          actor: h.actor as FeedItem["actor"],
          action: h.action,
          actor_name: h.actor_name,
          notes: h.notes,
          new_value: h.new_value,
          created_at: h.created_at,
          request_id: h.request_id,
          customer_name: h.program_requests?.customer_name,
          customer_company: h.program_requests?.customer_company,
          reference_number: h.program_requests?.reference_number,
        }));

        const adminItems: FeedItem[] = (adminData || []).map((a: any) => ({
          id: `a-${a.id}`,
          actor: "admin" as FeedItem["actor"],
          action: a.action,
          entity_id: a.entity_id,
          entity_type: a.entity_type,
          details: a.details,
          created_at: a.created_at,
        }));

        const combined = [...historyItems, ...adminItems].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setItems(combined.slice(0, 50));
      } catch (err) {
        console.error("Error fetching activity feed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeed();
  }, []);

  const filtered = filter === "all" ? items : items.filter((i) => i.actor === filter);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5" />
            Live activiteitenfeed
          </CardTitle>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FeedFilter)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3 h-7">Alles</TabsTrigger>
              <TabsTrigger value="customer" className="text-xs px-3 h-7">
                <User className="h-3 w-3 mr-1" />Klanten
              </TabsTrigger>
              <TabsTrigger value="partner" className="text-xs px-3 h-7">
                <Building2 className="h-3 w-3 mr-1" />Partners
              </TabsTrigger>
              <TabsTrigger value="admin" className="text-xs px-3 h-7">
                <Shield className="h-3 w-3 mr-1" />Admin
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Geen activiteiten gevonden
          </p>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
            {filtered.map((item) => {
              const meta = getActionMeta(item);
              const projectPath = item.request_id
                ? `/admin/aanvragen/${item.request_id}`
                : item.entity_id && item.entity_type === "program_request"
                ? `/admin/aanvragen/${item.entity_id}`
                : null;

              const displayName =
                item.customer_name ||
                item.actor_name ||
                (item.actor === "admin" ? "Admin" : null);

              const ref = item.reference_number;

              const inner = (
                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                  <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight">
                      {meta.label}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <ActorIcon actor={item.actor} />
                      <p className="text-xs text-muted-foreground truncate">
                        {displayName && <span className="font-medium">{displayName}</span>}
                        {ref && <span className="ml-1 text-muted-foreground/70">· {ref}</span>}
                        {item.notes && !displayName && (
                          <span>{item.notes}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 mt-0.5">
                    {relativeTime(item.created_at)}
                  </span>
                </div>
              );

              return projectPath ? (
                <Link key={item.id} to={projectPath} className="block">
                  {inner}
                </Link>
              ) : (
                <div key={item.id}>{inner}</div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
