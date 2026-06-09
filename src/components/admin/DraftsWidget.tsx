import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileClock } from "lucide-react";

type Stats = {
  open: number;
  recovered: number;
  last7: number;
  conversion: number;
};

export function DraftsWidget() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Array<{ id: string; email: string | null; created_at: string; recovered_at: string | null; source: string | null }>>([]);

  useEffect(() => {
    (async () => {
      const since7 = new Date(Date.now() - 7 * 86400_000).toISOString();
      const [{ data: all }, { data: recentRows }] = await Promise.all([
        supabase.from("program_drafts").select("id, recovered_at, created_at, expires_at"),
        supabase
          .from("program_drafts")
          .select("id, email, created_at, recovered_at, source")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      const list = all ?? [];
      const now = Date.now();
      const open = list.filter((d: any) => !d.recovered_at && new Date(d.expires_at).getTime() > now).length;
      const recovered = list.filter((d: any) => !!d.recovered_at).length;
      const last7 = list.filter((d: any) => d.created_at >= since7).length;
      const total = list.length;
      const conversion = total > 0 ? Math.round((recovered / total) * 100) : 0;
      setStats({ open, recovered, last7, conversion });
      setRecent((recentRows ?? []) as any);
    })();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileClock className="h-4 w-4 text-primary" />
          Concept-recovery
        </CardTitle>
        <p className="text-xs text-muted-foreground">Exit-intent & opgeslagen concepten</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {stats === null ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded border p-2">
                <div className="text-muted-foreground">Open</div>
                <div className="text-lg font-bold text-amber-600">{stats.open}</div>
              </div>
              <div className="rounded border p-2">
                <div className="text-muted-foreground">Hersteld</div>
                <div className="text-lg font-bold text-green-600">{stats.recovered}</div>
              </div>
              <div className="rounded border p-2">
                <div className="text-muted-foreground">Nieuw (7d)</div>
                <div className="text-lg font-bold">{stats.last7}</div>
              </div>
              <div className="rounded border p-2">
                <div className="text-muted-foreground">Recovery-rate</div>
                <div className="text-lg font-bold text-primary">{stats.conversion}%</div>
              </div>
            </div>
            {recent.length > 0 && (
              <ul className="space-y-1 text-xs">
                {recent.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 border-b pb-1 last:border-0">
                    <span className="truncate">{d.email ?? "(anoniem)"}</span>
                    <span className={d.recovered_at ? "text-green-600" : "text-muted-foreground"}>
                      {d.recovered_at ? "hersteld" : d.source ?? "open"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/admin/attributie" className="block text-xs text-primary hover:underline pt-1">
              Volledig overzicht →
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
