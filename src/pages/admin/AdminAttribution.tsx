import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

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

const PERIODS = [
  { id: "7", label: "Laatste 7 dagen" },
  { id: "30", label: "Laatste 30 dagen" },
  { id: "90", label: "Laatste 90 dagen" },
  { id: "365", label: "Laatste 12 maanden" },
];

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

  useEffect(() => {
    (async () => {
      setRows(null);
      const since = new Date(Date.now() - parseInt(period) * 86400_000).toISOString();
      const [{ data: pr }, { data: ar }, { data: dr }] = await Promise.all([
        supabase
          .from("program_requests")
          .select("id, customer_name, customer_email, reference_number, status, created_at, attribution")
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
      ]);
      const combined: Row[] = [
        ...((pr ?? []) as any[]).map((r) => ({ ...r, source: "program" as const })),
        ...((ar ?? []) as any[]).map((r) => ({ ...r, source: "accommodation" as const })),
      ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      setRows(combined);
      setDrafts(dr ?? []);
    })();
  }, [period]);

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

          <Tabs defaultValue="attribution">
            <TabsList>
              <TabsTrigger value="attribution">Herkomst ({total})</TabsTrigger>
              <TabsTrigger value="drafts">Concepten ({drafts?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="requests">Aanvragen ({rows?.length ?? 0})</TabsTrigger>
            </TabsList>

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
