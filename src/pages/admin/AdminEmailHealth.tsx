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
import { AlertTriangle, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

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

function pct(part: number, whole: number): string {
  if (whole <= 0) return "";
  return `${Math.round((part / whole) * 100)}%`;
}
