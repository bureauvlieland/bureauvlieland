/**
 * Dagelijkse kritieke-pad-zelftest.
 *
 * Waarom deze kaart bestaat: de RPC achter "programma samenstellen" was ruim
 * twee maanden stuk zonder dat wij iets zagen — klanten kregen alleen een
 * "tijdelijke storing". Unit-tests kunnen dat niet vangen (de fout zat in de
 * live database). De edge function `critical-selftest` doet daarom wat een
 * bezoeker doet, dagelijks om 05:45, en alarmeert per e-mail + Werkbank-taak.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, RefreshCw, Wrench, PlayCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";

export type SelftestCheck = {
  key: string;
  label: string;
  severity: "critical" | "warning";
  ok: boolean;
  detail: string;
  fixHint?: string;
  durationMs?: number;
  fixedByAutofix?: boolean;
};

type SelftestRun = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  triggered_by: string | null;
  checks: SelftestCheck[] | null;
  failed_count: number;
  autofixes: unknown[] | null;
  error_message: string | null;
  alerted_at: string | null;
};

const STALE_HOURS = 30;

export function CriticalSelftestCard() {
  const [running, setRunning] = useState(false);

  const { data: runs, refetch, isFetching } = useQuery({
    queryKey: ["selftest-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("selftest_runs")
        .select("id, started_at, finished_at, status, triggered_by, checks, failed_count, autofixes, error_message, alerted_at")
        .order("started_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as SelftestRun[];
    },
    refetchInterval: 120_000,
  });

  const latest = runs?.[0] ?? null;
  const checks = latest?.checks ?? [];
  const ageHours = latest ? (Date.now() - new Date(latest.started_at).getTime()) / 3_600_000 : Infinity;

  const health: "healthy" | "failed" | "stale" | "unknown" = !latest
    ? "unknown"
    : ageHours > STALE_HOURS
      ? "stale"
      : latest.status === "success"
        ? "healthy"
        : "failed";

  const tone: Record<typeof health, string> = {
    healthy: "bg-emerald-100 text-emerald-800",
    failed: "bg-red-100 text-red-800",
    stale: "bg-amber-100 text-amber-900",
    unknown: "bg-muted text-muted-foreground",
  };
  const label: Record<typeof health, string> = {
    healthy: "Alles werkt",
    failed: `${latest?.failed_count ?? 0} probleem(en)`,
    stale: "Geen recente run",
    unknown: "Nog niet gedraaid",
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("critical-selftest", {
        body: { triggeredBy: "admin", skipAlert: true },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Onbekende fout");
      const failedChecks = (data.checks as SelftestCheck[]).filter((c) => !c.ok);
      if (failedChecks.length === 0) toast.success("Zelftest: alle kritieke paden werken ✓");
      else toast.error(`Zelftest: ${failedChecks.length} probleem — ${failedChecks.map((c) => c.label).join(", ")}`);
      refetch();
    } catch (err) {
      toast.error(`Zelftest faalde: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {health === "healthy" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
          Dagelijkse kritieke-pad-test
          <Badge className={tone[health]}>{label[health]}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground pt-1">
          Draait elke nacht om 05:45 en doet wat een bezoeker doet: een echte online aanvraag
          versturen (en weer opruimen), de publieke catalogus, prijsstructuur, klantpagina,
          deellink, veerboottijden en de mailconfiguratie testen. Bij een probleem herstelt de
          test ontbrekende rechten automatisch, mailt het admin-adres en zet een Werkbank-taak
          met hoge prioriteit.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={running} onClick={runNow}>
            <PlayCircle className="h-4 w-4 mr-2" />
            {running ? "Test draait…" : "Nu testen"}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {!latest && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Nog geen run</AlertTitle>
            <AlertDescription>Draai de test handmatig met "Nu testen".</AlertDescription>
          </Alert>
        )}

        {health === "stale" && latest && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>De nachtelijke test heeft niet gedraaid</AlertTitle>
            <AlertDescription>
              Laatste run was {formatDistanceToNow(new Date(latest.started_at), { addSuffix: true, locale: nl })}.
              Controleer de geplande taak.
            </AlertDescription>
          </Alert>
        )}

        {latest && (
          <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
            <div className="font-medium">
              Laatste run —{" "}
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(latest.started_at), { addSuffix: true, locale: nl })}
                {" · "}
                {format(new Date(latest.started_at), "dd-MM-yyyy HH:mm", { locale: nl })}
                {" · "}
                {latest.triggered_by ?? "—"}
              </span>
            </div>
            {latest.error_message && (
              <div className="text-red-600"><strong>Fout:</strong> {latest.error_message}</div>
            )}
            {latest.alerted_at && (
              <div className="text-amber-700">
                Alert gemaild op {format(new Date(latest.alerted_at), "dd-MM-yyyy HH:mm", { locale: nl })}
              </div>
            )}
            {(latest.autofixes?.length ?? 0) > 0 && (
              <div className="flex items-center gap-1 text-sky-700">
                <Wrench className="h-3 w-3" /> Automatische herstelpoging uitgevoerd
              </div>
            )}
          </div>
        )}

        {checks.length > 0 && (
          <ul className="space-y-1">
            {checks.map((c) => (
              <li
                key={c.key}
                className={`rounded-md border p-2 text-xs ${
                  c.ok ? "bg-emerald-50/60 border-emerald-200" : "bg-red-50/70 border-red-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{c.ok ? (c.fixedByAutofix ? "🛠️" : "✅") : c.severity === "critical" ? "🛑" : "⚠️"}</span>
                  <span className="font-medium">{c.label}</span>
                  {c.severity === "critical" && !c.ok && (
                    <Badge className="bg-red-100 text-red-800">kritiek</Badge>
                  )}
                  {typeof c.durationMs === "number" && (
                    <span className="ml-auto text-muted-foreground">{c.durationMs} ms</span>
                  )}
                </div>
                <div className="text-muted-foreground mt-0.5">{c.detail}</div>
                {!c.ok && c.fixHint && (
                  <div className="mt-0.5 text-amber-800"><strong>Fix:</strong> {c.fixHint}</div>
                )}
              </li>
            ))}
          </ul>
        )}

        {runs && runs.length > 1 && (
          <div className="text-xs text-muted-foreground">
            Historie:{" "}
            {runs.slice(1).map((r) => (
              <span key={r.id} className="mr-2">
                {format(new Date(r.started_at), "dd-MM HH:mm", { locale: nl })}{" "}
                <span className={r.status === "success" ? "text-emerald-700" : "text-red-600"}>
                  {r.status === "success" ? "ok" : `${r.failed_count} fout`}
                </span>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
