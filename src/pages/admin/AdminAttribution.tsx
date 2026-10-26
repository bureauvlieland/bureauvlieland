import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  countByFormSource,
  metricsByOrigin,
  signingSummary,
  type RequestMetricRow,
} from "@/lib/requestMetrics";

type Row = {
  id: string;
  source: "program" | "accommodation";
  customer_name: string | null;
  customer_email: string | null;
  reference_number: string | null;
  status: string | null;
  created_at: string;
  attribution: Record<string, string | null> | null;
};

/** Programma-aanvragen met de velden voor de tabel per ingang (plan klantreis en ondertekening, fase 5). */
type MetricRow = RequestMetricRow & { created_at: string };

type ChatStats = { total: number; linked: number };

const PERIODS = [
  { id: "7", label: "Laatste 7 dagen" },
  { id: "30", label: "Laatste 30 dagen" },
  { id: "90", label: "Laatste 90 dagen" },
  { id: "365", label: "Laatste 12 maanden" },
  { id: "ytd", label: "Dit kalenderjaar" },
];

const sinceFor = (period: string): string =>
  period === "ytd"
    ? new Date(new Date().getFullYear(), 0, 1).toISOString()
    : new Date(Date.now() - parseInt(period) * 86400_000).toISOString();

const euro = (n: number) => `€ ${Math.round(n).toLocaleString("nl-NL")}`;

function group(rows: Row[], field: string) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const v = r.attribution?.[field];
    const key = v && String(v).trim() ? String(v) : "(geen)";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

const BarList = ({ items, total }: { items: [string, number][]; total: number }) => (
  <div className="space-y-2">
    {items.length === 0 ? (
      <p className="text-sm text-muted-foreground italic">Geen data</p>
    ) : (
      items.map(([key, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={key}>
            <div className="flex justify-between gap-2 text-sm mb-1">
              <span className="truncate" title={key}>{key}</span>
              <span className="text-muted-foreground tabular-nums">{count} · {pct}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })
    )}
  </div>
);

const AdminAttribution = () => {
  const [period, setPeriod] = useState("30");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [drafts, setDrafts] = useState<any[] | null>(null);
  const [metricRows, setMetricRows] = useState<MetricRow[] | null>(null);
  const [chatStats, setChatStats] = useState<ChatStats | null>(null);

  useEffect(() => {
    (async () => {
      setRows(null);
      setMetricRows(null);
      const since = sinceFor(period);
      const [{ data: pr }, { data: ar }, { data: dr }, { data: chats }] = await Promise.all([
        supabase
          .from("program_requests")
          .select(
            "id, customer_name, customer_email, reference_number, status, created_at, attribution, origin, cancelled_at, quote_status, completed_at, invoice_spec_total_incl_vat, terms_accepted_at, number_of_people, selected_dates",
          )
          .gte("created_at", since)
          .order("created_at", { ascending: false }),
        supabase
          .from("accommodation_requests")
          .select("id, customer_name, customer_email, reference_number, status, created_at, attribution")
          .gte("created_at", since)
          .order("created_at", { ascending: false }),
        supabase
          .from("program_drafts")
          .select("id, email, source, created_at, recovered_at, expires_at, email_send_count, last_email_sent_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false }),
        // Websitechat en WhatsApp: hoeveel gesprekken werden een aanvraag?
        supabase
          .from("chat_conversations")
          .select("id, request_id, source")
          .in("source", ["presales", "whatsapp"])
          .gte("created_at", since),
      ]);
      const combined: Row[] = [
        ...((pr ?? []) as any[]).map((r) => ({ ...r, source: "program" as const })),
        ...((ar ?? []) as any[]).map((r) => ({ ...r, source: "accommodation" as const })),
      ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      setRows(combined);
      setMetricRows((pr ?? []) as unknown as MetricRow[]);
      setDrafts(dr ?? []);
      const chatList = (chats ?? []) as { id: string; request_id: string | null }[];
      setChatStats({ total: chatList.length, linked: chatList.filter((c) => !!c.request_id).length });
    })();
  }, [period]);

  const perOrigin = useMemo(() => (metricRows ? metricsByOrigin(metricRows) : []), [metricRows]);
  const signing = useMemo(() => (metricRows ? signingSummary(metricRows) : null), [metricRows]);
  const formSources = useMemo(() => (metricRows ? countByFormSource(metricRows) : []), [metricRows]);
  const totals = useMemo(
    () =>
      perOrigin.reduce(
        (t, m) => ({
          requests: t.requests + m.requests,
          cancelled: t.cancelled + m.cancelled,
          won: t.won + m.won,
          signed: t.signed + m.signed,
          signedBeforeEvent: t.signedBeforeEvent + m.signedBeforeEvent,
          revenue: t.revenue + m.revenue,
        }),
        { requests: 0, cancelled: 0, won: 0, signed: 0, signedBeforeEvent: 0, revenue: 0 },
      ),
    [perOrigin],
  );

  const withAttr = useMemo(() => rows?.filter((r) => r.attribution) ?? [], [rows]);
  const total = withAttr.length;

  return (
    <>
      <Helmet>
        <title>Attributie & Concepten | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AdminLayout>
        <div className="p-6 space-y-6 max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Attributie & Concepten</h1>
              <p className="text-sm text-muted-foreground">
                Waar komen aanvragen vandaan, en hoeveel concepten worden hersteld?
              </p>
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm bg-card"
            >
              {PERIODS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <Tabs defaultValue="per-ingang">
            <TabsList>
              <TabsTrigger value="per-ingang">Per ingang ({metricRows?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="attribution">Herkomst ({total})</TabsTrigger>
              <TabsTrigger value="drafts">Concepten ({drafts?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="requests">Aanvragen ({rows?.length ?? 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="per-ingang" className="space-y-4 mt-4">
              {metricRows === null || signing === null ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Aanvragen per ingang</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Gewonnen = actief en uitgevoerd, gefactureerd of akkoord ontvangen. Getekend = handtekening onder de
                        voorwaarden; "vooraf" = vóór of op de eerste programmadag. Omzet = projecttotaal incl. btw van actieve
                        projecten. Dezelfde telling als de nulmeting in het plan klantreis en ondertekening.
                      </p>
                    </CardHeader>
                    <CardContent>
                      {perOrigin.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Geen aanvragen in deze periode.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="text-xs text-muted-foreground border-b">
                              <tr>
                                <th className="text-left py-2 px-2">Ingang</th>
                                <th className="text-right py-2 px-2">Aanvragen</th>
                                <th className="text-right py-2 px-2">Geannuleerd</th>
                                <th className="text-right py-2 px-2">Gewonnen</th>
                                <th className="text-right py-2 px-2">Getekend</th>
                                <th className="text-right py-2 px-2">Vooraf getekend</th>
                                <th className="text-right py-2 px-2">Omzet</th>
                                <th className="text-right py-2 px-2">Mediaan pers.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {perOrigin.map((m) => (
                                <tr key={m.origin} className="border-b last:border-0 hover:bg-muted/30">
                                  <td className="py-2 px-2">
                                    {m.label}
                                    <span className="ml-1 font-mono text-[11px] text-muted-foreground">{m.origin}</span>
                                  </td>
                                  <td className="py-2 px-2 text-right tabular-nums">{m.requests}</td>
                                  <td className="py-2 px-2 text-right tabular-nums">
                                    {m.cancelled}
                                    <span className="text-muted-foreground"> · {m.requests ? Math.round((m.cancelled / m.requests) * 100) : 0}%</span>
                                  </td>
                                  <td className="py-2 px-2 text-right tabular-nums font-medium">
                                    {m.won}
                                    <span className="font-normal text-muted-foreground"> · {m.requests ? Math.round((m.won / m.requests) * 100) : 0}%</span>
                                  </td>
                                  <td className="py-2 px-2 text-right tabular-nums">{m.signed}</td>
                                  <td className="py-2 px-2 text-right tabular-nums">{m.signedBeforeEvent}</td>
                                  <td className="py-2 px-2 text-right tabular-nums">{euro(m.revenue)}</td>
                                  <td className="py-2 px-2 text-right tabular-nums">{m.medianPeople ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="border-t text-xs font-medium">
                              <tr>
                                <td className="py-2 px-2">Totaal</td>
                                <td className="py-2 px-2 text-right tabular-nums">{totals.requests}</td>
                                <td className="py-2 px-2 text-right tabular-nums">{totals.cancelled}</td>
                                <td className="py-2 px-2 text-right tabular-nums">{totals.won}</td>
                                <td className="py-2 px-2 text-right tabular-nums">{totals.signed}</td>
                                <td className="py-2 px-2 text-right tabular-nums">{totals.signedBeforeEvent}</td>
                                <td className="py-2 px-2 text-right tabular-nums">{euro(totals.revenue)}</td>
                                <td className="py-2 px-2" />
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader><CardTitle className="text-base">Ondertekening van gewonnen projecten</CardTitle></CardHeader>
                      <CardContent className="space-y-1 text-sm">
                        <p>Gewonnen: <span className="font-medium tabular-nums">{signing.won}</span></p>
                        <p>Vóór de eerste dag getekend: <span className="font-medium tabular-nums">{signing.signedBeforeEvent}</span></p>
                        <p>Pas na de eerste dag getekend: <span className="font-medium tabular-nums">{signing.signedAfterEvent}</span></p>
                        <p>Nog niet getekend: <span className="font-medium tabular-nums">{signing.unsigned}</span></p>
                        <p className="pt-1 text-xs text-muted-foreground">Doel uit het plan: vrijwel alles vooraf getekend. Nulmeting 25 oktober 2026: 10 van 21.</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-base">Via welke weg het formulier geopend is</CardTitle></CardHeader>
                      <CardContent>
                        {formSources.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nog geen gegevens; wordt vastgelegd sinds fase 5 (26 oktober 2026).</p>
                        ) : (
                          <BarList items={formSources} total={formSources.reduce((s, [, n]) => s + n, 0)} />
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-base">Websitechat en WhatsApp</CardTitle></CardHeader>
                      <CardContent className="space-y-1 text-sm">
                        <p>Gesprekken: <span className="font-medium tabular-nums">{chatStats?.total ?? 0}</span></p>
                        <p>Daarvan een aanvraag geworden: <span className="font-medium tabular-nums">{chatStats?.linked ?? 0}</span></p>
                        <p className="pt-1 text-xs text-muted-foreground">
                          Koppelen gaat via "Aanvraag aanmaken" bij een gesprek in Berichten. Partner- en portaalchats tellen hier niet mee.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="attribution" className="space-y-4 mt-4">
              {rows === null ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base">UTM source</CardTitle></CardHeader>
                    <CardContent><BarList items={group(withAttr, "utm_source")} total={total} /></CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">UTM campaign</CardTitle></CardHeader>
                    <CardContent><BarList items={group(withAttr, "utm_campaign")} total={total} /></CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">UTM medium</CardTitle></CardHeader>
                    <CardContent><BarList items={group(withAttr, "utm_medium")} total={total} /></CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Entry page</CardTitle></CardHeader>
                    <CardContent><BarList items={group(withAttr, "entry_path")} total={total} /></CardContent>
                  </Card>
                  <Card className="md:col-span-2">
                    <CardHeader><CardTitle className="text-base">Referrer</CardTitle></CardHeader>
                    <CardContent><BarList items={group(withAttr, "referrer")} total={total} /></CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="drafts" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Opgeslagen concepten</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Concepten ontstaan via exit-intent of "stuur me deze opslag"; hersteld = klant heeft via de e-mail teruggekeerd.
                  </p>
                </CardHeader>
                <CardContent>
                  {drafts === null ? (
                    <Skeleton className="h-40 w-full" />
                  ) : drafts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Geen concepten in deze periode.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs text-muted-foreground border-b">
                          <tr>
                            <th className="text-left py-2 px-2">Datum</th>
                            <th className="text-left py-2 px-2">E-mail</th>
                            <th className="text-left py-2 px-2">Bron</th>
                            <th className="text-left py-2 px-2">Mails</th>
                            <th className="text-left py-2 px-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {drafts.map((d) => (
                            <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="py-2 px-2 whitespace-nowrap">
                                {new Date(d.created_at).toLocaleDateString("nl-NL")}
                              </td>
                              <td className="py-2 px-2">{d.email ?? <span className="text-muted-foreground italic">(anoniem)</span>}</td>
                              <td className="py-2 px-2">{d.source ?? "—"}</td>
                              <td className="py-2 px-2 tabular-nums">{d.email_send_count ?? 0}</td>
                              <td className="py-2 px-2">
                                {d.recovered_at ? (
                                  <Badge className="bg-green-600">Hersteld</Badge>
                                ) : new Date(d.expires_at) < new Date() ? (
                                  <Badge variant="secondary">Verlopen</Badge>
                                ) : (
                                  <Badge variant="outline">Open</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requests" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Aanvragen met herkomst</CardTitle>
                </CardHeader>
                <CardContent>
                  {rows === null ? (
                    <Skeleton className="h-40 w-full" />
                  ) : rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Geen aanvragen in deze periode.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs text-muted-foreground border-b">
                          <tr>
                            <th className="text-left py-2 px-2">Datum</th>
                            <th className="text-left py-2 px-2">Ref</th>
                            <th className="text-left py-2 px-2">Klant</th>
                            <th className="text-left py-2 px-2">Type</th>
                            <th className="text-left py-2 px-2">UTM source</th>
                            <th className="text-left py-2 px-2">Entry</th>
                            <th className="text-left py-2 px-2">Referrer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={`${r.source}-${r.id}`} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="py-2 px-2 whitespace-nowrap">
                                {new Date(r.created_at).toLocaleDateString("nl-NL")}
                              </td>
                              <td className="py-2 px-2 font-mono text-xs">{r.reference_number ?? "—"}</td>
                              <td className="py-2 px-2">{r.customer_name}</td>
                              <td className="py-2 px-2">
                                <Badge variant="outline">{r.source === "program" ? "Programma" : "Logies"}</Badge>
                              </td>
                              <td className="py-2 px-2">{r.attribution?.utm_source ?? "—"}</td>
                              <td className="py-2 px-2 max-w-[200px] truncate" title={r.attribution?.entry_path ?? ""}>
                                {r.attribution?.entry_path ?? "—"}
                              </td>
                              <td className="py-2 px-2 max-w-[200px] truncate" title={r.attribution?.referrer ?? ""}>
                                {r.attribution?.referrer ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </>
  );
};

export default AdminAttribution;
