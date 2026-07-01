import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Clock,
} from "lucide-react";
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
  source_signals?: Array<{
    cooldown?: "hot" | "warm" | "cold";
    last_contact_days?: number | null;
  }> | null;
}

const PRIORITY_META: Record<string, { label: string; tone: string }> = {
  urgent: { label: "Urgent", tone: "bg-red-50 text-red-700 border-red-200" },
  normal: { label: "Actie deze week", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  info: { label: "Info", tone: "bg-slate-50 text-slate-600 border-slate-200" },
};

async function fetchOpenRecommendations(): Promise<Recommendation[]> {
  const { data, error } = await supabase
    .from("admin_recommendations")
    .select("*")
    .eq("status", "open")
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  const order = { urgent: 0, normal: 1, info: 2 } as const;
  return ((data ?? []) as unknown as Recommendation[]).sort(
    (a, b) =>
      (order[a.priority as keyof typeof order] ?? 3) -
      (order[b.priority as keyof typeof order] ?? 3),
  );
}

async function fetchLastRun(): Promise<
  { created_at: string; status: string; input_summary?: any } | null
> {
  const { data } = await supabase
    .from("claudia_run_log")
    .select("created_at, status, input_summary")
    .eq("run_type", "daily_scan")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as any;
}

function cooldownPill(rec: Recommendation): { label: string; tone: string } | null {
  const s = rec.source_signals?.find((x) => x.cooldown);
  if (!s?.cooldown) return null;
  if (s.cooldown === "hot") {
    return {
      label: `Recent contact${s.last_contact_days != null ? ` (${s.last_contact_days}d)` : ""}`,
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (s.cooldown === "warm") {
    return {
      label: `${s.last_contact_days ?? "?"}d geleden contact`,
      tone: "bg-sky-50 text-sky-700 border-sky-200",
    };
  }
  return null;
}

export const ClaudiaRecommendationsCard = () => {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const { data: recs = [], isLoading } = useQuery({
    queryKey: ["claudia-recommendations"],
    queryFn: fetchOpenRecommendations,
    refetchInterval: 60_000,
  });

  const projectIds = useMemo(
    () =>
      Array.from(
        new Set(
          recs
            .filter((r) => r.related_entity_type === "program_request" && r.related_entity_id)
            .map((r) => r.related_entity_id as string),
        ),
      ),
    [recs],
  );

  const { data: projectLabels = {} } = useQuery({
    queryKey: ["claudia-project-labels", projectIds.sort().join(",")],
    enabled: projectIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_requests")
        .select("id, customer_company, customer_name")
        .in("id", projectIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) {
        const label = (row.customer_company || row.customer_name || "").trim();
        if (label) map[row.id] = label;
      }
      return map;
    },
  });

  const { data: lastRun } = useQuery({
    queryKey: ["claudia-last-run"],
    queryFn: fetchLastRun,
    refetchInterval: 60_000,
  });

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
      .update({ status, feedback_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Kon status niet opslaan", description: error.message, variant: "destructive" });
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
      toast({ title: "Claudia draait...", description: "Aanbevelingen worden ververst." });
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

  // Groepeer per project (program_request); andere entiteiten in "Overig"
  type Group = { key: string; label: string; deeplink: string | null; recs: Recommendation[] };
  const { urgentGroups, normalGroups, infoGroups } = useMemo(() => {
    const groupFor = (prio: "urgent" | "normal" | "info"): Group[] => {
      const items = recs.filter((r) => r.priority === prio);
      const byKey = new Map<string, Group>();
      for (const r of items) {
        const isProject = r.related_entity_type === "program_request" && r.related_entity_id;
        const key = isProject ? `p:${r.related_entity_id}` : `o:${r.id}`;
        const label = isProject
          ? projectLabels[r.related_entity_id as string] ?? "Project"
          : "Overig";
        const deeplink = r.deeplink ?? null;
        const existing = byKey.get(key);
        if (existing) existing.recs.push(r);
        else byKey.set(key, { key, label, deeplink, recs: [r] });
      }
      return Array.from(byKey.values());
    };
    return {
      urgentGroups: groupFor("urgent"),
      normalGroups: groupFor("normal"),
      infoGroups: groupFor("info"),
    };
  }, [recs, projectLabels]);

  const suppressedCount: number = lastRun?.input_summary?.suppressed_by_cooldown ?? 0;
  const suppressedBreakdown: { cooldown?: number; terminal?: number; werkbank?: number } | undefined =
    lastRun?.input_summary?.suppressed_breakdown;
  const suppressedLabel = (() => {
    if (!suppressedCount) return null;
    const parts: string[] = [];
    if (suppressedBreakdown?.werkbank) parts.push(`${suppressedBreakdown.werkbank} al op werkbank`);
    if (suppressedBreakdown?.terminal) parts.push(`${suppressedBreakdown.terminal} afgerond/gefactureerd`);
    if (suppressedBreakdown?.cooldown) parts.push(`${suppressedBreakdown.cooldown} recent contact`);
    return parts.length > 0 ? parts.join(" · ") : `${suppressedCount} onderdrukt`;
  })();

  const lastRunText = lastRun
    ? `Laatste run: ${new Date(lastRun.created_at).toLocaleString("nl-NL", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "Nog niet gedraaid";

  const renderGroup = (group: Group, sectionTone: string) => (
    <div key={group.key} className="rounded-lg border bg-white">
      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 truncate">{group.label}</span>
          {group.recs.length > 1 && (
            <Badge variant="secondary" className="text-[10px]">{group.recs.length}</Badge>
          )}
        </div>
        {group.deeplink && (
          <Link
            to={group.deeplink}
            className="text-[11px] text-violet-700 hover:underline flex items-center gap-1 shrink-0"
          >
            Open <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
      <ul className="divide-y divide-slate-100">
        {group.recs.map((r) => {
          const pill = cooldownPill(r);
          return (
            <li key={r.id} className={cn("px-3 py-2.5 text-sm", sectionTone)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900 leading-snug flex items-center gap-2 flex-wrap">
                    <span>{r.title}</span>
                    {pill && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1",
                          pill.tone,
                        )}
                      >
                        <Clock className="h-2.5 w-2.5" />
                        {pill.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{r.body}</p>
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
            </li>
          );
        })}
      </ul>
    </div>
  );

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
                <Badge variant="secondary" className="text-[10px]">{recs.length}</Badge>
              )}
            </h2>
            <p className="text-[11px] text-slate-500 truncate">
              {lastRunText}
              {suppressedLabel && (
                <span className="ml-1 text-slate-400">— {suppressedLabel} onderdrukt</span>
              )}
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
          {isLoading && <div className="text-xs text-slate-500 italic px-2 py-3">Laden...</div>}

          {!isLoading && recs.length === 0 && (
            <div className="text-center py-8 px-4">
              <Sparkles className="h-6 w-6 text-violet-300 mx-auto mb-2" />
              <p className="text-sm text-slate-600 font-medium">Alles in orde — geen openstaande aanbevelingen.</p>
              <p className="text-xs text-slate-400 mt-1">
                Claudia checkt elke ochtend automatisch. Klik "Run nu" voor een directe scan.
              </p>
            </div>
          )}

          {urgentGroups.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                  {PRIORITY_META.urgent.label} ({urgentGroups.length})
                </span>
              </div>
              {urgentGroups.map((g) => renderGroup(g, PRIORITY_META.urgent.tone))}
            </div>
          )}

          {normalGroups.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                  {PRIORITY_META.normal.label} ({normalGroups.length})
                </span>
              </div>
              {normalGroups.map((g) => renderGroup(g, PRIORITY_META.normal.tone))}
            </div>
          )}

          {infoGroups.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setInfoOpen((o) => !o)}
                className="flex items-center gap-1.5 px-1 text-[10px] uppercase tracking-wider font-semibold text-slate-500 hover:text-slate-700"
              >
                {infoOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {PRIORITY_META.info.label} ({infoGroups.length})
              </button>
              {infoOpen && infoGroups.map((g) => renderGroup(g, PRIORITY_META.info.tone))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
