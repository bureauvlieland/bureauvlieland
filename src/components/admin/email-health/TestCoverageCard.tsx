import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, ShieldAlert, TestTube, ChevronDown, ChevronUp } from "lucide-react";
import {
  EDGE_FUNCTION_COVERAGE,
  CATEGORY_LABELS,
  computeCoverageStats,
  type EdgeFunctionCategory,
  type EdgeFunctionCoverage,
} from "@/lib/edgeFunctionTestCoverage";

type CategoryFilter = "all" | EdgeFunctionCategory;
type StatusFilter = "all" | "tested" | "missing" | "critical_missing";

export function TestCoverageCard() {
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("critical_missing");
  const [search, setSearch] = useState("");

  const stats = useMemo(() => computeCoverageStats(EDGE_FUNCTION_COVERAGE), []);
  const coveragePct = Math.round((stats.tested / stats.total) * 100);
  const criticalPct = Math.round((stats.criticalTested / stats.critical) * 100);
  const criticalGap = stats.critical - stats.criticalTested;

  const filtered = useMemo(() => {
    return EDGE_FUNCTION_COVERAGE.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (status === "tested" && !r.tested) return false;
      if (status === "missing" && r.tested) return false;
      if (status === "critical_missing" && (r.tested || !r.critical)) return false;
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [category, status, search]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Testdekking edge functions
            <Badge variant="outline" className="ml-2">
              {stats.tested}/{stats.total} · {coveragePct}%
            </Badge>
            {criticalGap > 0 ? (
              <Badge variant="destructive" className="gap-1">
                <ShieldAlert className="h-3 w-3" />
                {criticalGap} kritiek zonder test
              </Badge>
            ) : (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Kritiek volledig gedekt
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className="gap-1"
          >
            {expanded ? <><ChevronUp className="h-4 w-4" /> Inklappen</> : <><ChevronDown className="h-4 w-4" /> Details</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProgressBlock
            label="Totale dekking"
            value={stats.tested}
            total={stats.total}
            pct={coveragePct}
            tone={coveragePct >= 60 ? "ok" : coveragePct >= 30 ? "warn" : "danger"}
          />
          <ProgressBlock
            label="Kritieke functies"
            value={stats.criticalTested}
            total={stats.critical}
            pct={criticalPct}
            tone={criticalGap === 0 ? "ok" : criticalGap <= 5 ? "warn" : "danger"}
          />
        </div>

        {stats.criticalMissing.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {stats.criticalMissing.length} kritieke edge function(s) zonder automatische test
            </AlertTitle>
            <AlertDescription>
              <p className="text-sm mb-2">
                Deze functies raken facturatie, klant- of partnercommunicatie. Voeg minimaal een
                Deno-test toe met OPTIONS/CORS, auth- en validatie-paden.
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-auto">
                {stats.criticalMissing.map((r) => (
                  <Badge key={r.name} variant="outline" className="text-[11px] font-mono">
                    {r.name}
                  </Badge>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {expanded && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Zoek edge function…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
              <Select value={category} onValueChange={(v) => setCategory(v as CategoryFilter)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle categorieën</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical_missing">Kritiek zonder test</SelectItem>
                  <SelectItem value="missing">Alle zonder test</SelectItem>
                  <SelectItem value="tested">Met test</SelectItem>
                  <SelectItem value="all">Alles</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground self-center ml-auto">
                {filtered.length} functie(s)
              </div>
            </div>

            <div className="border rounded-md max-h-[420px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Function</TableHead>
                    <TableHead>Categorie</TableHead>
                    <TableHead>Kritiek</TableHead>
                    <TableHead>Test</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        Geen resultaten voor deze filter.
                      </TableCell>
                    </TableRow>
                  ) : filtered.map((r) => <CoverageRow key={r.name} row={r} />)}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-muted-foreground">
              Registry: <code className="text-[11px]">src/lib/edgeFunctionTestCoverage.ts</code> —
              werk deze bij bij elke nieuwe edge function of nieuw <code>*_test.ts</code>-bestand.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProgressBlock({
  label, value, total, pct, tone,
}: { label: string; value: number; total: number; pct: number; tone: "ok" | "warn" | "danger" }) {
  const toneCls =
    tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-red-600";
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-lg font-semibold ${toneCls}`}>{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
      <div className="text-xs text-muted-foreground mt-1">{value} van {total} functies</div>
    </div>
  );
}

function CoverageRow({ row }: { row: EdgeFunctionCoverage }) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{row.name}</TableCell>
      <TableCell>
        <Badge variant="outline" className="text-[11px]">
          {CATEGORY_LABELS[row.category]}
        </Badge>
      </TableCell>
      <TableCell>
        {row.critical ? (
          <Badge variant="destructive" className="text-[11px]">Kritiek</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">–</span>
        )}
      </TableCell>
      <TableCell>
        {row.tested ? (
          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3" />
            {row.testKind === "e2e" ? "E2E" : "Deno"}
          </Badge>
        ) : row.critical ? (
          <Badge variant="destructive" className="gap-1 text-[11px]">
            <AlertTriangle className="h-3 w-3" /> Ontbreekt
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[11px]">Geen</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}
