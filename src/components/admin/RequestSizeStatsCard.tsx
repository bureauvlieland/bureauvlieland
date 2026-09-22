import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { buildSizeStats, describeEntryPaths, PERIODS, type StatsPeriod } from "@/lib/requestSizeStats";

/**
 * Aanvragen per groepsgrootte (docs/plan-grote-groepen.md, "Meten"): de
 * blik die het seizoen moet opleveren. Verwijderde aanvragen tellen niet
 * mee; de instappagina gaat pas sinds 19 september 2026 met elke aanvraag
 * mee, daarvoor staat hij op "onbekend".
 */
export const RequestSizeStatsCard = () => {
  const [period, setPeriod] = useState<StatsPeriod>("dit_jaar");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-request-size-stats"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_requests")
        .select("number_of_people, status, created_at, selected_dates, attribution, linked_accommodation_id, terms_accepted_at")
        .neq("status", "deleted");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(() => buildSizeStats(requests, period, new Date()), [requests, period]);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Aanvragen per groepsgrootte</CardTitle>
          <CardDescription>
            Wat het seizoen brengt, per klasse: aanvragen, lopend, getekend, geannuleerd, met logies, meerdaags en de instappagina's.
          </CardDescription>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as StatsPeriod)}>
          <SelectTrigger className="h-8 w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.key} value={p.key}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Laden…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Groepsgrootte</TableHead>
                <TableHead className="text-right">Aanvragen</TableHead>
                <TableHead className="text-right">Lopend</TableHead>
                <TableHead className="text-right">Getekend</TableHead>
                <TableHead className="text-right">Geannuleerd</TableHead>
                <TableHead className="text-right">Met logies</TableHead>
                <TableHead className="text-right">Meerdaags</TableHead>
                <TableHead>Instappagina's</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key} className={r.key === "totaal" ? "font-medium" : undefined}>
                  <TableCell>{r.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.aanvragen}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.lopend}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.getekend}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.geannuleerd}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.metLogies}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.meerdaags}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{describeEntryPaths(r.instappaginas) || "–"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Op aanmaakdatum, zonder verwijderde aanvragen. De instappagina gaat pas sinds 19 september 2026 mee; daarvoor staat hij op "onbekend".
        </p>
      </CardContent>
    </Card>
  );
};
