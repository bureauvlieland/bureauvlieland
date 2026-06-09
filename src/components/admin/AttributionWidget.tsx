import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";

type AttrRow = { attribution: any | null; created_at: string };

type Bucket = { key: string; count: number };

const PERIODS = [
  { id: "7", label: "7d" },
  { id: "30", label: "30d" },
  { id: "90", label: "90d" },
] as const;

function bucket(rows: AttrRow[], field: string): Bucket[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const raw = r.attribution?.[field];
    const key = raw && String(raw).trim() ? String(raw) : "(geen)";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

const Section = ({ title, items, total }: { title: string; items: Bucket[]; total: number }) => (
  <div>
    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{title}</div>
    {items.length === 0 ? (
      <p className="text-xs text-muted-foreground italic">Geen data</p>
    ) : (
      <ul className="space-y-1">
        {items.map((it) => {
          const pct = total > 0 ? Math.round((it.count / total) * 100) : 0;
          return (
            <li key={it.key} className="flex items-center gap-2 text-xs">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2">
                  <span className="truncate text-foreground" title={it.key}>{it.key}</span>
                  <span className="text-muted-foreground tabular-nums">{it.count} · {pct}%</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden mt-0.5">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);

export function AttributionWidget() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("30");
  const [rows, setRows] = useState<AttrRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setRows(null);
      const since = new Date(Date.now() - parseInt(period) * 86400_000).toISOString();
      const [{ data: pr }, { data: ar }] = await Promise.all([
        supabase.from("program_requests").select("attribution, created_at").gte("created_at", since).not("attribution", "is", null),
        supabase.from("accommodation_requests").select("attribution, created_at").gte("created_at", since).not("attribution", "is", null),
      ]);
      if (!cancelled) setRows([...(pr ?? []), ...(ar ?? [])] as AttrRow[]);
    };
    load();
    return () => { cancelled = true; };
  }, [period]);

  const total = rows?.length ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Attributie
          </CardTitle>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`text-[10px] px-2 py-0.5 rounded border transition ${
                  period === p.id ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {rows === null ? "Laden…" : `${total} aanvragen met herkomst`}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows === null ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : (
          <>
            <Section title="UTM source" items={bucket(rows, "utm_source")} total={total} />
            <Section title="Entry page" items={bucket(rows, "entry_path")} total={total} />
            <Section title="Referrer" items={bucket(rows, "referrer")} total={total} />
          </>
        )}
        <Link to="/admin/attributie" className="block text-xs text-primary hover:underline pt-1">
          Bekijk volledig attributie-overzicht →
        </Link>
      </CardContent>
    </Card>
  );
}
