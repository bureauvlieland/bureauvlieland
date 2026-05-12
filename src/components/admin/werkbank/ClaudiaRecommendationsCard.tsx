import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Check, X, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Recommendation {
  id: string;
  kind: string;
  priority: "urgent" | "normal" | "info";
  title: string;
  body: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  deeplink: string | null;
  status: string;
  created_at: string;
  expires_at: string;
}

const PRIORITY_META: Record<string, { label: string; tone: string; ring: string }> = {
  urgent: {
    label: "Urgent",
    tone: "bg-red-50 text-red-700 border-red-200",
    ring: "ring-red-200",
  },
  normal: {
    label: "Actie",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
    ring: "ring-amber-200",
  },
  info: {
    label: "Info",
    tone: "bg-slate-50 text-slate-600 border-slate-200",
    ring: "ring-slate-200",
  },
};

async function fetchOpenRecommendations(): Promise<Recommendation[]> {
  const { data, error } = await supabase
    .from("admin_recommendations")
    .select("*")
    .eq("status", "open")
    .gte("expires_at", new Date().toISOString())
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  // priority sort: urgent < normal < info — alfabetisch klopt niet; sort manueel
  const order = { urgent: 0, normal: 1, info: 2 } as const;
  return ((data ?? []) as unknown as Recommendation[]).sort(
    (a, b) =>
      (order[a.priority as keyof typeof order] ?? 3) -
      (order[b.priority as keyof typeof order] ?? 3),
  );
}

async function fetchLastRun(): Promise<{ created_at: string; status: string } | null> {
  const { data } = await supabase
    .from("claudia_run_log")
    .select("created_at, status")
    .eq("run_type", "daily_scan")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export const ClaudiaRecommendationsCard = () => {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const { data: recs = [], isLoading } = useQuery({
    queryKey: ["claudia-recommendations"],
    queryFn: fetchOpenRecommendations,
    refetchInterval: 60_000,
  });

  const { data: lastRun } = useQuery({
    queryKey: ["claudia-last-run"],
    queryFn: fetchLastRun,
    refetchInterval: 60_000,
  });

  // Realtime: refresh when new recommendations land
  useEffect(() => {
    const ch = supabase
      .channel("claudia-recs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_recommendations" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["claudia-recommendations"] });
          queryClient.invalidateQueries({ queryKey: ["claudia-recommendations-count"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [queryClient]);

  const updateStatus = async (id: string, status: "done" | "dismissed") => {
    const { error } = await supabase
      .from("admin_recommendations")
      .update({
        status,
        feedback_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      toast({
        title: "Kon status niet opslaan",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["claudia-recommendations"] });
    queryClient.invalidateQueries({ queryKey: ["claudia-recommendations-count"] });
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("claudia-daily-scan");
      if (error) throw error;
      toast({
        title: "Claudia draait...",
        description: "Aanbevelingen worden ververst.",
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["claudia-recommendations"] });
        queryClient.invalidateQueries({ queryKey: ["claudia-last-run"] });
      }, 1500);
    } catch (err) {
      toast({
        title: "Run mislukt",
        description: err instanceof Error ? err.message : "Onbekende fout",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const grouped = {
    urgent: recs.filter((r) => r.priority === "urgent"),
    normal: recs.filter((r) => r.priority === "normal"),
    info: recs.filter((r) => r.priority === "info"),
  };

  const lastRunText = lastRun
    ? `Laatste run: ${new Date(lastRun.created_at).toLocaleString("nl-NL", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "Nog niet gedraaid";

  return (
    <section className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/50 to-white shadow-sm">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-violet-100">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 text-left flex-1 min-w-0"
        >
          <div className="h-8 w-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              Claudia — aanbevelingen vandaag
              {recs.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {recs.length}
                </Badge>
              )}
            </h2>
            <p className="text-[11px] text-slate-500 truncate">
              {lastRunText}
              {lastRun?.status === "error" && (
                <span className="text-red-600 ml-1">— laatste run faalde</span>
              )}
            </p>
          </div>
        </button>
        <Button
          size="sm"
          variant="outline"
          onClick={runNow}
          disabled={running}
          className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", running && "animate-spin")} />
          {running ? "Bezig..." : "Run nu"}
        </Button>
      </header>

      {!collapsed && (
        <div className="p-3 space-y-3">
          {isLoading && (
            <div className="text-xs text-slate-500 italic px-2 py-3">Laden...</div>
          )}

          {!isLoading && recs.length === 0 && (
            <div className="text-center py-8 px-4">
              <Sparkles className="h-6 w-6 text-violet-300 mx-auto mb-2" />
              <p className="text-sm text-slate-600 font-medium">Alles in orde — geen openstaande aanbevelingen.</p>
              <p className="text-xs text-slate-400 mt-1">
                Claudia checkt elke ochtend automatisch. Klik "Run nu" voor een directe scan.
              </p>
            </div>
          )}

          {(["urgent", "normal", "info"] as const).map((prio) => {
            const items = grouped[prio];
            if (items.length === 0) return null;
            const meta = PRIORITY_META[prio];
            return (
              <div key={prio} className="space-y-1.5">
                <div className="flex items-center gap-2 px-1">
                  {prio === "urgent" && <AlertCircle className="h-3.5 w-3.5 text-red-600" />}
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                    {meta.label} ({items.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {items.map((r) => (
                    <div
                      key={r.id}
                      className={cn(
                        "rounded-lg border bg-white px-3 py-2.5 text-sm",
                        meta.tone,
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-900 leading-snug">
                            {r.title}
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                            {r.body}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {r.deeplink && (
                            <Link
                              to={r.deeplink}
                              className="h-7 w-7 rounded-md hover:bg-white/60 flex items-center justify-center text-slate-600 hover:text-violet-700 transition-colors"
                              title="Open"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          )}
                          <button
                            onClick={() => updateStatus(r.id, "done")}
                            className="h-7 w-7 rounded-md hover:bg-white/60 flex items-center justify-center text-slate-600 hover:text-emerald-700 transition-colors"
                            title="Opgepakt"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => updateStatus(r.id, "dismissed")}
                            className="h-7 w-7 rounded-md hover:bg-white/60 flex items-center justify-center text-slate-600 hover:text-red-700 transition-colors"
                            title="Niet relevant"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
