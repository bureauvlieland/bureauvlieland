import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  PlusCircle,
  Send,
  FileInput,
  Wifi,
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
  isNew?: boolean;
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
        return { label: "Klant verwijdert activiteit", icon: <XCircle className="h-4 w-4" />, color: "text-red-600 bg-red-50" };
      case "add_activity":
        return { label: "Klant voegt activiteit toe", icon: <PlusCircle className="h-4 w-4" />, color: "text-green-600 bg-green-50" };
      case "program_request_submitted":
        return { label: "Nieuwe programmaanvraag ingediend", icon: <FileInput className="h-4 w-4" />, color: "text-indigo-600 bg-indigo-50" };
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
      case "invoice_registered":
        return { label: "Partner registreert factuur", icon: <FileText className="h-4 w-4" />, color: "text-purple-600 bg-purple-50" };
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
      case "admin_sent_to_partners":
        return { label: "Admin stuurt naar partners", icon: <Send className="h-4 w-4" />, color: "text-indigo-600 bg-indigo-50" };
      case "quote_sent":
        return { label: "Offerte verzonden naar klant", icon: <Send className="h-4 w-4" />, color: "text-green-600 bg-green-50" };
      default:
        return { label: action, icon: <Activity className="h-4 w-4" />, color: "text-indigo-600 bg-indigo-50" };
    }
  }

  return { label: action, icon: <Activity className="h-4 w-4" />, color: "text-slate-600 bg-slate-50" };
}

function getSubtitle(item: FeedItem): string | null {
  const { action, notes, new_value, customer_company } = item;
  if (action === "status_changed" && notes) return notes;
  if (action === "counter_proposed" && notes) return `"${notes}"`;
  if (action === "billing_updated" && customer_company) return customer_company;
  if (action === "item_accepted" && notes) return notes;
  if (action === "add_activity" && notes) return notes;
  if ((new_value as any)?.block_name) return (new_value as any).block_name;
  return null;
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

function isRecentlyNew(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 5 * 60 * 1000;
}

function formatExactTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LiveActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [isLive, setIsLive] = useState(false);

  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    try {
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
        .limit(60);

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

      setItems(combined.slice(0, 60));
    } catch (err) {
      console.error("Error fetching activity feed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();

    const channel = supabase
      .channel("activity-feed-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "program_request_history",
        },
        async (payload) => {
          const newItem = payload.new as any;
          // Skip portal views to avoid spamming the feed
          if (newItem.action === "customer_portal_viewed") return;

          const { data: req } = await supabase
            .from("program_requests")
            .select("customer_name, customer_company, reference_number")
            .eq("id", newItem.request_id)
            .single();

          const feedItem: FeedItem = {
            id: `h-${newItem.id}`,
            actor: newItem.actor,
            action: newItem.action,
            actor_name: newItem.actor_name,
            notes: newItem.notes,
            new_value: newItem.new_value,
            created_at: newItem.created_at,
            request_id: newItem.request_id,
            customer_name: req?.customer_name,
            customer_company: req?.customer_company,
            reference_number: req?.reference_number,
            isNew: true,
          };

          setItems((prev) => [feedItem, ...prev].slice(0, 60));
          setFlashIds((prev) => new Set(prev).add(feedItem.id));
          setTimeout(() => {
            setFlashIds((prev) => {
              const next = new Set(prev);
              next.delete(feedItem.id);
              return next;
            });
          }, 3000);
        }
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFeed]);

  const filtered = filter === "all" ? items : items.filter((i) => i.actor === filter);
  const dimmed = (item: FeedItem) => item.action === "customer_portal_viewed";

  return (
    <TooltipProvider>
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5" />
              Live activiteitenfeed
              <span className="flex items-center gap-1.5 ml-1">
                <span className={`h-2 w-2 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-slate-300"}`} />
                {isLive && (
                  <span className="text-xs font-normal text-green-600 flex items-center gap-1">
                    <Wifi className="h-3 w-3" />
                    Live
                  </span>
                )}
              </span>
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
        <CardContent className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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
            <div className="space-y-0.5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 340px)", minHeight: "400px" }}>
              {filtered.map((item) => {
                const meta = getActionMeta(item);
                const subtitle = getSubtitle(item);
                const isFlashing = flashIds.has(item.id);
                const isDimmed = dimmed(item);
                const showNew = isRecentlyNew(item.created_at) || item.isNew;

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
                  <div
                    className={`
                      flex items-start gap-3 px-2 py-2.5 rounded-lg transition-colors group
                      ${isFlashing ? "animate-flash-new" : ""}
                      ${isDimmed ? "opacity-50" : "hover:bg-muted/50"}
                    `}
                  >
                    <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-medium leading-tight ${isDimmed ? "text-muted-foreground" : "text-foreground"}`}>
                          {meta.label}
                        </p>
                        {showNew && !isDimmed && (
                          <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-500 text-white border-0 rounded-full">
                            NIEUW
                          </Badge>
                        )}
                        {ref && (
                          <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                            {ref}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <ActorIcon actor={item.actor} />
                        <p className="text-xs text-muted-foreground truncate">
                          {displayName && <span className="font-medium">{displayName}</span>}
                          {subtitle && (
                            <span className="text-muted-foreground/80 ml-1">· {subtitle}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 mt-0.5 cursor-default">
                          {relativeTime(item.created_at)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p className="text-xs">{formatExactTime(item.created_at)}</p>
                      </TooltipContent>
                    </Tooltip>
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
    </TooltipProvider>
  );
}
