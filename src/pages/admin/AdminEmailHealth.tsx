import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, RefreshCw, Trash2, ShieldOff, FileText, Download, ExternalLink, History, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect } from "react";
import { TestCoverageCard } from "@/components/admin/email-health/TestCoverageCard";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";


type EmailLogRow = {
  id: string;
  email_type: string;
  subject: string | null;
  recipient_email: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  blocked_at: string | null;
  spam_at: string | null;
  open_count: number | null;
  click_count: number | null;
  mailjet_message_id: string | null;
  error_message: string | null;
  mailjet_events: unknown;
};

const RANGE_OPTIONS = [
  { value: "24h", label: "Laatste 24 uur", hours: 24 },
  { value: "7d", label: "Laatste 7 dagen", hours: 24 * 7 },
  { value: "30d", label: "Laatste 30 dagen", hours: 24 * 30 },
] as const;

type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  opened: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
  clicked: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  bounced: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  blocked: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  spam: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={STATUS_COLORS[status] ?? "bg-muted"}>
      {status}
    </Badge>
  );
}

function useEmailLog(hours: number) {
  return useQuery({
    queryKey: ["admin-email-health", hours],
    queryFn: async () => {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("email_log")
        .select(
          "id,email_type,subject,recipient_email,status,created_at,sent_at,delivered_at,opened_at,clicked_at,bounced_at,blocked_at,spam_at,open_count,click_count,mailjet_message_id,error_message,mailjet_events",
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as EmailLogRow[];
    },
    refetchInterval: 30_000,
  });
}

/**
 * Dedupliceer op mailjet_message_id (of id als fallback). Group-mails
 * produceren N rijen met dezelfde message_id; we willen ze in de tabel
 * en KPI's als 1 mail zien maar wél kunnen tonen naar wie het ging.
 * We houden de rij met de "sterkste" status (clicked > opened > ...).
 */
const STATUS_RANK: Record<string, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  opened: 3,
  clicked: 4,
  spam: 5,
  blocked: 6,
  bounced: 7,
  failed: 8,
};

function dedupeByMessageId(rows: EmailLogRow[]): EmailLogRow[] {
  const map = new Map<string, EmailLogRow>();
  for (const row of rows) {
    const key = row.mailjet_message_id ?? `nokey:${row.id}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
    } else {
      const a = STATUS_RANK[row.status] ?? -1;
      const b = STATUS_RANK[existing.status] ?? -1;
      if (a > b) map.set(key, row);
    }
  }
  return Array.from(map.values());
}

export default function AdminEmailHealth() {
  const [range, setRange] = useState<RangeValue>("7d");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const hours = RANGE_OPTIONS.find((r) => r.value === range)?.hours ?? 168;
  const { data: rowsRaw, isLoading, refetch, isFetching } = useEmailLog(hours);

  const deduped = useMemo(() => dedupeByMessageId(rowsRaw ?? []), [rowsRaw]);

  const templates = useMemo(() => {
    const set = new Set<string>();
    (rowsRaw ?? []).forEach((r) => set.add(r.email_type));
    return Array.from(set).sort();
  }, [rowsRaw]);

  const filtered = useMemo(() => {
    return deduped.filter((r) => {
      if (templateFilter !== "all" && r.email_type !== templateFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search && !r.recipient_email.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [deduped, templateFilter, statusFilter, search]);

  // ── KPI counters (op gefilterde deduped set) ────────────────────────────
  const total = filtered.length;
  const countBy = (predicate: (r: EmailLogRow) => boolean) =>
    filtered.filter(predicate).length;

  const kpiSent = countBy((r) => ["sent", "delivered", "opened", "clicked"].includes(r.status));
  const kpiDelivered = countBy((r) => !!r.delivered_at || ["delivered", "opened", "clicked"].includes(r.status));
  const kpiOpened = countBy((r) => !!r.opened_at || ["opened", "clicked"].includes(r.status));
  const kpiClicked = countBy((r) => !!r.clicked_at || r.status === "clicked");
  const kpiFailed = countBy((r) => ["failed", "bounced", "blocked"].includes(r.status));
  const kpiMissingId = countBy((r) => !r.mailjet_message_id && r.status === "sent");

  // Verdachte mails: verstuurd meer dan 24u geleden, geen delivered_at, geen error.
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const stuck = filtered.filter(
    (r) =>
      r.status === "sent" &&
      !r.delivered_at &&
      !r.opened_at &&
      !r.clicked_at &&
      new Date(r.created_at).getTime() < dayAgo,
  );

  // Per-template overzicht
  const perTemplate = useMemo(() => {
    const map = new Map<string, { total: number; delivered: number; opened: number; clicked: number; failed: number }>();
    for (const r of deduped) {
      const cur = map.get(r.email_type) ?? { total: 0, delivered: 0, opened: 0, clicked: 0, failed: 0 };
      cur.total += 1;
      if (r.delivered_at || ["delivered", "opened", "clicked"].includes(r.status)) cur.delivered += 1;
      if (r.opened_at || ["opened", "clicked"].includes(r.status)) cur.opened += 1;
      if (r.clicked_at || r.status === "clicked") cur.clicked += 1;
      if (["failed", "bounced", "blocked"].includes(r.status)) cur.failed += 1;
      map.set(r.email_type, cur);
    }
    return Array.from(map.entries())
      .map(([email_type, stats]) => ({ email_type, ...stats }))
      .sort((a, b) => b.total - a.total);
  }, [deduped]);

  // Webhook heartbeat: zijn er events in de laatste 24u?
  const eventsInWindow = (rowsRaw ?? []).filter(
    (r) => r.delivered_at || r.opened_at || r.clicked_at || r.bounced_at,
  ).length;
  const showWebhookWarning = hours >= 24 && (rowsRaw?.length ?? 0) > 10 && eventsInWindow === 0;

  return (
    <AdminLayout>
      <Helmet>
        <title>Email health · Bureau Vlieland</title>
      </Helmet>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Email health</h1>
            <p className="text-sm text-muted-foreground">
              Live status van alle uitgaande mails, deliverability en webhook-events.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={(v) => setRange(v as RangeValue)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {showWebhookWarning && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Geen webhook-events ontvangen</AlertTitle>
            <AlertDescription>
              Er zijn wel mails verstuurd in de laatste 24 uur, maar geen enkele opened/delivered/clicked/bounced
              event vanuit Mailjet binnengekomen. Controleer de webhook-configuratie in Mailjet (URL & token).
            </AlertDescription>
          </Alert>
        )}

        {kpiMissingId > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{kpiMissingId} mail(s) zonder Mailjet MessageID</AlertTitle>
            <AlertDescription>
              Deze mails zijn verstuurd, maar de MessageID is niet vastgelegd — feedback (open/click/bounce)
              kan hier niet worden gekoppeld. Dit hoort naar 0 te dalen naarmate de edge functions zijn gefixt.
            </AlertDescription>
          </Alert>
        )}

        <AuditReportCard />

        <TestCoverageCard />

        <AutoCloseCard />

        <HistoricalBackfillCard />



        {/* KPI-tegels */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Totaal" value={total} />
          <KpiCard label="Verstuurd" value={kpiSent} />
          <KpiCard label="Bezorgd" value={kpiDelivered} sub={pct(kpiDelivered, kpiSent)} />
          <KpiCard label="Geopend" value={kpiOpened} sub={pct(kpiOpened, kpiDelivered)} />
          <KpiCard label="Geklikt" value={kpiClicked} sub={pct(kpiClicked, kpiDelivered)} />
          <KpiCard label="Mislukt" value={kpiFailed} tone={kpiFailed > 0 ? "warn" : undefined} />
        </div>

        {/* Verdachte mails */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${stuck.length ? "text-orange-500" : "text-muted-foreground"}`} />
              Verdachte mails ({stuck.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stuck.length === 0 ? (
              <p className="text-sm text-muted-foreground">Alle verstuurde mails hebben binnen 24 uur feedback ontvangen.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Ontvanger</TableHead>
                    <TableHead>Verstuurd</TableHead>
                    <TableHead>MessageID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stuck.slice(0, 25).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.email_type}</TableCell>
                      <TableCell>{r.recipient_email}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: nl })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.mailjet_message_id ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Per-template */}
        <Card>
          <CardHeader><CardTitle>Per template</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead className="text-right">Totaal</TableHead>
                  <TableHead className="text-right">Bezorgd</TableHead>
                  <TableHead className="text-right">Geopend</TableHead>
                  <TableHead className="text-right">Geklikt</TableHead>
                  <TableHead className="text-right">Mislukt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perTemplate.map((t) => (
                  <TableRow key={t.email_type}>
                    <TableCell className="font-mono text-xs">{t.email_type}</TableCell>
                    <TableCell className="text-right">{t.total}</TableCell>
                    <TableCell className="text-right">{t.delivered} <span className="text-xs text-muted-foreground">{pct(t.delivered, t.total)}</span></TableCell>
                    <TableCell className="text-right">{t.opened} <span className="text-xs text-muted-foreground">{pct(t.opened, t.delivered)}</span></TableCell>
                    <TableCell className="text-right">{t.clicked}</TableCell>
                    <TableCell className={`text-right ${t.failed ? "text-red-600 font-medium" : ""}`}>{t.failed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <SuppressionsCard />

        {/* Log tabel */}

        <Card>
          <CardHeader>
            <CardTitle>Email log</CardTitle>
            <div className="flex flex-wrap gap-2 pt-2">
              <Input
                placeholder="Zoek op ontvanger..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
              <Select value={templateFilter} onValueChange={setTemplateFilter}>
                <SelectTrigger className="w-[240px]"><SelectValue placeholder="Template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle templates</SelectItem>
                  {templates.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  {Object.keys(STATUS_RANK).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tijd</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Ontvanger</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Opens</TableHead>
                    <TableHead>Klik</TableHead>
                    <TableHead>Fout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: nl })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.email_type}</TableCell>
                      <TableCell>{r.recipient_email}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-xs">{r.open_count ?? 0}</TableCell>
                      <TableCell className="text-xs">{r.click_count ?? 0}</TableCell>
                      <TableCell className="text-xs text-red-600 max-w-[240px] truncate" title={r.error_message ?? ""}>
                        {r.error_message ?? ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {filtered.length > 100 && (
              <p className="text-xs text-muted-foreground mt-2">
                Alleen de eerste 100 rijen getoond. Verfijn de filters om meer te zien.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function KpiCard({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone?: "warn" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-semibold ${tone === "warn" ? "text-red-600" : ""}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function AuditReportCard() {
  const reportUrl = "/audit-communicatie-email-2026-07-08.md";
  const reportName = "audit-communicatie-email-2026-07-08.md";

  const handleDownload = async () => {
    try {
      const res = await fetch(reportUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = reportName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Audit-rapport gedownload");
    } catch {
      toast.error("Download mislukt");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-500" />
          Audit-rapport e-mailcommunicatie
        </CardTitle>
        <p className="text-xs text-muted-foreground pt-1">
          Overzicht van de huidige hardening-status: suppressie, idempotency, test-mode en openstaande acties.
        </p>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => window.open(reportUrl, "_blank")}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open in nieuw tabblad
        </Button>
        <Button onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Downloaden
        </Button>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Auto-close: sluit acties op projecten met datum in het verleden
// ─────────────────────────────────────────────────────────────────────────
function AutoCloseCard() {
  const [running, setRunning] = useState<null | "dry" | "real">(null);
  const [lastResult, setLastResult] = useState<
    | null
    | {
        dryRun: boolean;
        at: string;
        result: {
          projects_scanned: number;
          projects_past_execution: number;
          items_confirmed: number;
          quotes_expired: number;
          todos_closed: number;
          projects_marked_ready_for_invoice: number;
          errors: Array<{ project_id: string; error: string }>;
        };
      }
  >(null);

  const run = async (dry: boolean) => {
    setRunning(dry ? "dry" : "real");
    try {
      const { data, error } = await supabase.functions.invoke(
        "auto-close-past-execution",
        { body: { dryRun: dry } },
      );
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Onbekende fout");
      setLastResult({ dryRun: dry, at: new Date().toISOString(), result: data.result });
      toast.success(
        dry
          ? `Simulatie klaar — ${data.result.projects_past_execution} projecten in verleden gevonden`
          : `Auto-close uitgevoerd — ${data.result.todos_closed} todo's afgesloten`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Auto-close mislukt: ${msg}`);
    } finally {
      setRunning(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-emerald-600" />
          Auto-close · projecten na uitvoering
        </CardTitle>
        <p className="text-xs text-muted-foreground pt-1">
          Sluit automatisch openstaande goedkeur-acties (items, offertes, todo's)
          voor projecten waarvan de laatste uitvoeringsdatum voorbij is. Facturatie-,
          voorwaarden-, commissie- en aftersales-todo's blijven altijd staan.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!!running} onClick={() => run(true)}>
            {running === "dry" ? "Bezig…" : "Simuleren (dry run)"}
          </Button>
          <Button disabled={!!running} onClick={() => run(false)}>
            {running === "real" ? "Bezig…" : "Nu draaien"}
          </Button>
        </div>
        {lastResult && (
          <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
            <div className="flex items-center gap-2 font-medium">
              <span>{lastResult.dryRun ? "Simulatie" : "Uitgevoerd"}</span>
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(lastResult.at), { addSuffix: true, locale: nl })}
              </span>
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <li>Projecten gescand: <strong>{lastResult.result.projects_scanned}</strong></li>
              <li>In verleden: <strong>{lastResult.result.projects_past_execution}</strong></li>
              <li>Items → bevestigd: <strong>{lastResult.result.items_confirmed}</strong></li>
              <li>Offertes → verlopen: <strong>{lastResult.result.quotes_expired}</strong></li>
              <li>Todo's gesloten: <strong>{lastResult.result.todos_closed}</strong></li>
              <li>
                Klaar voor facturatie:{" "}
                <strong>{lastResult.result.projects_marked_ready_for_invoice}</strong>
              </li>
            </ul>
            {lastResult.result.errors.length > 0 && (
              <div className="text-red-600 mt-2">
                <strong>Fouten:</strong>
                <ul className="list-disc ml-5">
                  {lastResult.result.errors.map((e, i) => (
                    <li key={i}>{e.project_id}: {e.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Historische auto-close backfill: veilig handmatig draaien over alle projecten
// waarvan de uitvoerdatum in het verleden ligt. Twee-staps flow (simulatie →
// bevestiging → uitvoering) met persistente run-historie in localStorage.
// ─────────────────────────────────────────────────────────────────────────
type BackfillResult = {
  projects_scanned: number;
  projects_past_execution: number;
  items_confirmed: number;
  items_marked_handled?: number;
  quotes_expired: number;
  todos_closed: number;
  projects_marked_ready_for_invoice: number;
  errors: Array<{ project_id: string; error: string }>;
};

type BackfillRun = {
  id: string;
  at: string;
  dryRun: boolean;
  durationMs: number;
  result: BackfillResult;
};

const BACKFILL_STORAGE_KEY = "admin.autoclose.backfill.runs";
const MAX_RUN_HISTORY = 10;

function loadBackfillHistory(): BackfillRun[] {
  try {
    const raw = localStorage.getItem(BACKFILL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RUN_HISTORY) : [];
  } catch {
    return [];
  }
}

function saveBackfillHistory(runs: BackfillRun[]) {
  try {
    localStorage.setItem(
      BACKFILL_STORAGE_KEY,
      JSON.stringify(runs.slice(0, MAX_RUN_HISTORY)),
    );
  } catch {
    /* quota / disabled — negeer */
  }
}

function HistoricalBackfillCard() {
  const [running, setRunning] = useState<null | "dry" | "real">(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [history, setHistory] = useState<BackfillRun[]>(() => loadBackfillHistory());
  const [preview, setPreview] = useState<BackfillRun | null>(null);

  // Loop een timer terwijl er iets draait zodat de gebruiker voortgang ziet.
  useEffect(() => {
    if (!running || !startedAt) return;
    const tick = () => setElapsed(Date.now() - startedAt);
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [running, startedAt]);

  const latestReal = useMemo(() => history.find((r) => !r.dryRun) ?? null, [history]);

  const runBackfill = async (dry: boolean) => {
    setRunning(dry ? "dry" : "real");
    setStartedAt(Date.now());
    setElapsed(0);
    const start = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke(
        "auto-close-past-execution",
        { body: { dryRun: dry } },
      );
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Onbekende fout");
      const run: BackfillRun = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        at: new Date().toISOString(),
        dryRun: dry,
        durationMs: Date.now() - start,
        result: data.result as BackfillResult,
      };
      const next = [run, ...history].slice(0, MAX_RUN_HISTORY);
      setHistory(next);
      saveBackfillHistory(next);
      if (dry) setPreview(run);
      toast.success(
        dry
          ? `Simulatie klaar — ${run.result.projects_past_execution} projecten zouden worden bijgewerkt`
          : `Backfill uitgevoerd — ${run.result.projects_marked_ready_for_invoice} projecten op ready_for_invoice gezet`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Backfill mislukt: ${msg}`);
    } finally {
      setRunning(null);
      setStartedAt(null);
    }
  };

  const startConfirmed = async () => {
    setConfirmOpen(false);
    setConfirmChecked(false);
    await runBackfill(false);
  };

  const clearHistory = () => {
    setHistory([]);
    saveBackfillHistory([]);
    setPreview(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-4 w-4 text-amber-600" />
          Historische auto-close backfill
        </CardTitle>
        <p className="text-xs text-muted-foreground pt-1">
          Draait de auto-close over <strong>alle</strong> historische projecten waarvan de
          uitvoerdatum voorbij is. Idempotent — projecten die al klaar zijn worden overgeslagen.
          Voer altijd eerst de simulatie uit en controleer de aantallen voordat je écht draait.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!!running}
            onClick={() => runBackfill(true)}
          >
            {running === "dry" ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Simuleren…</>
            ) : (
              "Simuleren (dry run)"
            )}
          </Button>
          <Button
            variant="destructive"
            disabled={!!running || !preview}
            onClick={() => setConfirmOpen(true)}
            title={!preview ? "Voer eerst een simulatie uit" : undefined}
          >
            {running === "real" ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Backfill draait…</>
            ) : (
              "Historische backfill draaien"
            )}
          </Button>
          {history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearHistory} disabled={!!running}>
              <Trash2 className="h-4 w-4 mr-1" />
              Historie wissen
            </Button>
          )}
        </div>

        {running && (
          <div className="rounded-md border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 p-3 text-xs flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-amber-700 dark:text-amber-400" />
            <span>
              {running === "dry" ? "Simulatie" : "Backfill"} bezig — {(elapsed / 1000).toFixed(1)}s
              verstreken. Sluit dit tabblad niet af.
            </span>
          </div>
        )}

        {preview && !running && (
          <Alert>
            <AlertTitle className="flex items-center gap-2">
              Simulatie-resultaat
              <Badge variant="outline">dry run</Badge>
            </AlertTitle>
            <AlertDescription className="text-xs">
              <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
                <li>Projecten gescand: <strong>{preview.result.projects_scanned}</strong></li>
                <li>In verleden: <strong>{preview.result.projects_past_execution}</strong></li>
                <li>Items → bevestigd: <strong>{preview.result.items_confirmed}</strong></li>
                <li>Items → afgehandeld: <strong>{preview.result.items_marked_handled ?? 0}</strong></li>
                <li>Offertes → verlopen: <strong>{preview.result.quotes_expired}</strong></li>
                <li>Todo's gesloten: <strong>{preview.result.todos_closed}</strong></li>
                <li>Ready for invoice: <strong>{preview.result.projects_marked_ready_for_invoice}</strong></li>
                <li>Fouten: <strong>{preview.result.errors.length}</strong></li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {latestReal && (
          <div className="rounded-md border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 p-3 text-xs">
            <div className="flex items-center gap-2 font-medium text-emerald-900 dark:text-emerald-200">
              Laatste echte backfill
              <span className="text-emerald-800/70 dark:text-emerald-300/70 font-normal">
                {formatDistanceToNow(new Date(latestReal.at), { addSuffix: true, locale: nl })}
              </span>
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
              <li>Projecten in verleden: <strong>{latestReal.result.projects_past_execution}</strong></li>
              <li>Ready for invoice: <strong>{latestReal.result.projects_marked_ready_for_invoice}</strong></li>
              <li>Items bevestigd: <strong>{latestReal.result.items_confirmed}</strong></li>
              <li>Todo's gesloten: <strong>{latestReal.result.todos_closed}</strong></li>
              <li>Offertes verlopen: <strong>{latestReal.result.quotes_expired}</strong></li>
              <li>Duur: <strong>{(latestReal.durationMs / 1000).toFixed(1)}s</strong></li>
            </ul>
            {latestReal.result.errors.length > 0 && (
              <div className="text-red-600 mt-2">
                <strong>Fouten ({latestReal.result.errors.length}):</strong>
                <ul className="list-disc ml-5 max-h-32 overflow-auto">
                  {latestReal.result.errors.slice(0, 20).map((e, i) => (
                    <li key={i}>{e.project_id}: {e.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {history.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Run-historie ({history.length})
            </summary>
            <div className="mt-2 rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8">Wanneer</TableHead>
                    <TableHead className="h-8">Type</TableHead>
                    <TableHead className="h-8 text-right">In verleden</TableHead>
                    <TableHead className="h-8 text-right">Bevestigd</TableHead>
                    <TableHead className="h-8 text-right">Todo's</TableHead>
                    <TableHead className="h-8 text-right">Ready</TableHead>
                    <TableHead className="h-8 text-right">Duur</TableHead>
                    <TableHead className="h-8 text-right">Fouten</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="py-1.5">
                        {format(new Date(r.at), "d MMM HH:mm", { locale: nl })}
                      </TableCell>
                      <TableCell className="py-1.5">
                        {r.dryRun ? (
                          <Badge variant="outline">simulatie</Badge>
                        ) : (
                          <Badge>uitgevoerd</Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 text-right">{r.result.projects_past_execution}</TableCell>
                      <TableCell className="py-1.5 text-right">{r.result.items_confirmed}</TableCell>
                      <TableCell className="py-1.5 text-right">{r.result.todos_closed}</TableCell>
                      <TableCell className="py-1.5 text-right">{r.result.projects_marked_ready_for_invoice}</TableCell>
                      <TableCell className="py-1.5 text-right">{(r.durationMs / 1000).toFixed(1)}s</TableCell>
                      <TableCell className="py-1.5 text-right">
                        {r.result.errors.length > 0 ? (
                          <span className="text-red-600">{r.result.errors.length}</span>
                        ) : (
                          "0"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </details>
        )}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Historische backfill definitief draaien?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Deze actie werkt data bij op basis van de laatste simulatie:{" "}
                  <strong>{preview?.result.projects_past_execution ?? 0}</strong> projecten
                  worden bijgewerkt, <strong>{preview?.result.items_confirmed ?? 0}</strong>{" "}
                  items op bevestigd gezet en{" "}
                  <strong>{preview?.result.todos_closed ?? 0}</strong> todo's afgesloten.
                </p>
                <p>
                  De operatie is idempotent, maar zet wel status­velden en{" "}
                  <code>auto_closed_reason</code> op de rijen. Facturatie- en
                  aftersales-todo's blijven ongemoeid.
                </p>
                <label className="flex items-center gap-2 pt-2 cursor-pointer">
                  <Checkbox
                    checked={confirmChecked}
                    onCheckedChange={(v) => setConfirmChecked(v === true)}
                  />
                  <span>Ik heb de simulatie bekeken en wil doorgaan.</span>
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmChecked(false)}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              disabled={!confirmChecked}
              onClick={startConfirmed}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ja, backfill draaien
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}



function pct(part: number, whole: number): string {
  if (whole <= 0) return "";
  return `${Math.round((part / whole) * 100)}%`;
}

// ─────────────────────────────────────────────────────────────────────────
// Suppressie-lijst: adressen waarnaar we niet meer mogen mailen (bounces,
// spamklachten, uitschrijvingen, handmatig geblokt).
// ─────────────────────────────────────────────────────────────────────────
type SuppressionRow = {
  id: string;
  email: string;
  reason: string;
  source: string | null;
  notes: string | null;
  created_at: string;
};

const REASON_COLORS: Record<string, string> = {
  bounce: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  spam: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  blocked: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  unsub: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  manual: "bg-muted text-muted-foreground",
};

function SuppressionsCard() {
  const [newEmail, setNewEmail] = useState("");
  const [newReason, setNewReason] = useState("manual");
  const [newNotes, setNewNotes] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["email-suppressions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_suppressions")
        .select("id,email,reason,source,notes,created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as SuppressionRow[];
    },
    refetchInterval: 60_000,
  });

  const rows = data ?? [];

  const addSuppression = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Geen geldig e-mailadres");
      return;
    }
    const { error } = await supabase.from("email_suppressions").insert({
      email,
      reason: newReason,
      source: "admin",
      notes: newNotes || null,
    });
    if (error) {
      toast.error(`Toevoegen mislukt: ${error.message}`);
      return;
    }
    toast.success(`${email} toegevoegd aan suppressielijst`);
    setNewEmail("");
    setNewNotes("");
    refetch();
  };

  const removeSuppression = async (id: string, email: string) => {
    if (!confirm(`${email} van suppressielijst verwijderen? Volgende mails naar dit adres worden dan weer verstuurd.`)) return;
    const { error } = await supabase.from("email_suppressions").delete().eq("id", id);
    if (error) {
      toast.error(`Verwijderen mislukt: ${error.message}`);
      return;
    }
    toast.success(`${email} verwijderd`);
    refetch();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldOff className="h-4 w-4 text-orange-500" />
          Suppressielijst ({rows.length})
        </CardTitle>
        <p className="text-xs text-muted-foreground pt-1">
          Adressen die niet meer worden gemaild. Wordt automatisch aangevuld door Mailjet-webhook bij
          hard bounces, spamklachten, uitschrijvingen en blocks.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-end border-b pb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">E-mailadres</label>
            <Input
              placeholder="voorbeeld@domein.nl"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Reden</label>
            <Select value={newReason} onValueChange={setNewReason}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Handmatig</SelectItem>
                <SelectItem value="bounce">Bounce</SelectItem>
                <SelectItem value="spam">Spamklacht</SelectItem>
                <SelectItem value="blocked">Geblokt</SelectItem>
                <SelectItem value="unsub">Uitgeschreven</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">Notitie (optioneel)</label>
            <Input
              placeholder="Waarom geblokkeerd?"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </div>
          <Button onClick={addSuppression}>Toevoegen</Button>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen geblokte adressen — alle mailboxen accepteren onze mail.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Reden</TableHead>
                <TableHead>Bron</TableHead>
                <TableHead>Sinds</TableHead>
                <TableHead>Notitie</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={REASON_COLORS[r.reason] ?? "bg-muted"}>
                      {r.reason}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.source ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(r.created_at), "dd-MM-yyyy", { locale: nl })}
                  </TableCell>
                  <TableCell className="text-xs max-w-[280px] truncate" title={r.notes ?? ""}>
                    {r.notes ?? ""}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeSuppression(r.id, r.email)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

