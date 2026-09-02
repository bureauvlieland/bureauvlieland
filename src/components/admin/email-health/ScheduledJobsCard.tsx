import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, HelpCircle, RefreshCw, Timer } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

/**
 * Toont de ECHTE status van elke geplande taak: niet alleen of de aanroep
 * verstuurd is, maar wat de functie erachter teruggaf (HTTP-status uit
 * `cron_dispatch_log`). Uitkomsten die we niet kennen heten expliciet
 * "onbekend" — nooit groen op basis van niets.
 */

interface JobHealthRow {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
  last_run_start: string | null;
  last_run_status: string | null;
  last_http_status: number | null;
  last_http_error: string | null;
  outcome: "ok" | "fout" | "onbekend" | "nooit_gedraaid" | "aanroep_mislukt";
  runs_last_24h: number;
  failures_last_7d: number;
}

const OUTCOME_META: Record<
  JobHealthRow["outcome"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }
> = {
  ok: { label: "OK", variant: "default", icon: CheckCircle2 },
  fout: { label: "Fout", variant: "destructive", icon: AlertTriangle },
  aanroep_mislukt: { label: "Aanroep mislukt", variant: "destructive", icon: AlertTriangle },
  nooit_gedraaid: { label: "Nooit gedraaid", variant: "destructive", icon: Clock },
  onbekend: { label: "Onbekend", variant: "outline", icon: HelpCircle },
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" });
}

export function ScheduledJobsCard() {
  const [running, setRunning] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["scheduled-job-health"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_scheduled_job_health");
      if (error) throw error;
      return (data ?? []) as unknown as JobHealthRow[];
    },
    refetchInterval: 5 * 60_000,
  });

  const runWatchdog = async () => {
    setRunning(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("cron-watchdog");
      if (error) throw error;
      const alarms = (res as { alarms?: unknown[] } | null)?.alarms?.length ?? 0;
      toast[alarms > 0 ? "warning" : "success"](
        alarms > 0
          ? `${alarms} taak/taken vragen aandacht — zie Werkbank`
          : "Alle geplande taken zijn gezond",
      );
      await refetch();
    } catch (err) {
      toast.error(`Controle mislukt: ${(err as Error).message}`);
    } finally {
      setRunning(false);
    }
  };

  const rows = data ?? [];
  const problems = rows.filter(
    (r) => r.active && (r.outcome === "fout" || r.outcome === "aanroep_mislukt" || r.outcome === "nooit_gedraaid"),
  ).length;
  const unknown = rows.filter((r) => r.active && r.outcome === "onbekend").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-4 w-4" />
          Geplande taken
          {problems > 0 && <Badge variant="destructive">{problems} probleem</Badge>}
          {problems === 0 && rows.length > 0 && <Badge variant="secondary">geen storingen</Badge>}
        </CardTitle>
        <CardDescription>
          Werkelijke uitkomst per automatische taak (HTTP-antwoord van de functie), niet alleen of de
          aanroep verstuurd is. {unknown > 0 && `${unknown} taak/taken met nog onbekende uitkomst.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Verversen
          </Button>
          <Button size="sm" onClick={runWatchdog} disabled={running}>
            {running ? "Bezig…" : "Nu controleren"}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive">
            Status kon niet worden geladen: {(error as Error).message}
          </p>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Laden…</p>}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Taak</th>
                  <th className="py-2 pr-3">Schema</th>
                  <th className="py-2 pr-3">Laatste run</th>
                  <th className="py-2 pr-3">Uitkomst</th>
                  <th className="py-2 pr-3">24u</th>
                  <th className="py-2 pr-3">Fouten 7d</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const meta = OUTCOME_META[r.outcome] ?? OUTCOME_META.onbekend;
                  const Icon = meta.icon;
                  return (
                    <tr key={r.jobid} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">
                        {r.jobname}
                        {!r.active && (
                          <Badge variant="outline" className="ml-2">
                            uit
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{r.schedule}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{formatWhen(r.last_run_start)}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={meta.variant} className="gap-1">
                          <Icon className="h-3 w-3" />
                          {meta.label}
                          {r.last_http_status ? ` ${r.last_http_status}` : ""}
                        </Badge>
                        {r.last_http_error && (
                          <div className="mt-1 max-w-xs truncate text-xs text-destructive" title={r.last_http_error}>
                            {r.last_http_error}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{r.runs_last_24h}</td>
                      <td className="py-2 pr-3">
                        {r.failures_last_7d > 0 ? (
                          <span className="text-destructive">{r.failures_last_7d}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
