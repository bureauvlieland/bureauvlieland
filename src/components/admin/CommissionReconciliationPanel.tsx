import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Euro,
  Link2Off,
  RefreshCw,
  Scale,
  ShieldOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type {
  ReconRow,
  ReconStatus,
  ReconSummary,
} from "@/lib/commissionReconciliation";

interface ReconResponse {
  rows: ReconRow[];
  summary: ReconSummary;
  settings: { toleranceEur: number; tolerancePct: number };
}

const statusMeta: Record<
  ReconStatus,
  { label: string; className: string; description: string }
> = {
  missing_invoice: {
    label: "Inkoopfactuur ontbreekt",
    className: "bg-red-100 text-red-800",
    description:
      "Wij hebben dit onderdeel verkocht, maar de partner heeft geen inkoopfactuur ingediend. Zonder factuur wordt er geen commissie gefactureerd.",
  },
  unlinked_invoice: {
    label: "Niet gekoppeld",
    className: "bg-amber-100 text-amber-900",
    description:
      "De inkoopfactuur is wel geregistreerd, maar niet gekoppeld aan een programma-onderdeel en valt daarmee buiten de commissieflow.",
  },
  deviation: {
    label: "Afwijking",
    className: "bg-orange-100 text-orange-800",
    description:
      "Het bedrag op de inkoopfactuur wijkt af van onze verkoopwaarde. Controleer of er extra kosten of correcties zijn.",
  },
  match: {
    label: "Match",
    className: "bg-green-100 text-green-800",
    description: "Verkoopwaarde en inkoopfactuur komen overeen.",
  },
  exempt: {
    label: "Commissievrij",
    className: "bg-slate-100 text-slate-700",
    description: "Voor deze regel geldt geen commissie.",
  },
};

const euro = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "—"
    : new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

const shortDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : format(d, "d MMM yyyy", { locale: nl });
};

interface Props {
  partnerId?: string | null;
}

export function CommissionReconciliationPanel({ partnerId = null }: Props) {
  const [statusFilter, setStatusFilter] = useState<"open" | "all" | ReconStatus>("open");
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch, isFetching } = useQuery<ReconResponse>({
    queryKey: ["commission-reconciliation", partnerId],
    queryFn: async () => {
      const response = await supabase.functions.invoke("get-commission-reconciliation", {
        body: { partnerId },
      });
      if (response.error) throw response.error;
      return response.data as ReconResponse;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["commission-reconciliation"] });
    queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
  };

  /** Factureer commissie op basis van onze verkoopprijs i.p.v. de inkoopfactuur. */
  const billOnSales = useMutation({
    mutationFn: async (row: ReconRow) => {
      if (!row.itemId) throw new Error("Geen programma-onderdeel gekoppeld");
      const { error: updateError } = await supabase
        .from("program_request_items")
        .update({
          commission_basis: "sales",
          commission_basis_reason: "Handmatig: geen (tijdige) inkoopfactuur ontvangen",
          commission_status: "pending",
        })
        .eq("id", row.itemId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast({
        title: "Op verkoopwaarde gezet",
        description: "De commissie staat nu klaar om te factureren.",
      });
      invalidate();
    },
    onError: (e) =>
      toast({
        title: "Kon niet bijwerken",
        description: e instanceof Error ? e.message : "Onbekende fout",
        variant: "destructive",
      }),
  });

  /** Markeer een niet-gekoppelde inkoopfactuur als commissievrij. */
  const markExempt = useMutation({
    mutationFn: async (row: ReconRow) => {
      if (!row.invoiceId) throw new Error("Geen inkoopfactuur gevonden");
      const { error: updateError } = await supabase
        .from("partner_purchase_invoices")
        .update({
          commission_exempt: true,
          commission_exempt_reason: "Handmatig commissievrij verklaard",
        })
        .eq("id", row.invoiceId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast({ title: "Commissievrij", description: "De factuur telt niet meer mee." });
      invalidate();
    },
    onError: (e) =>
      toast({
        title: "Kon niet bijwerken",
        description: e instanceof Error ? e.message : "Onbekende fout",
        variant: "destructive",
      }),
  });

  /** Datum waarop een regel wordt gesorteerd: uitvoering, anders factuurdatum. */
  const rowDate = (row: ReconRow) => row.executionDate ?? row.invoiceDate ?? null;

  const rows = useMemo(() => {
    const all = data?.rows ?? [];
    const term = search.trim().toLowerCase();
    return all
      .filter((r) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "open") {
          return (
            r.status === "missing_invoice" ||
            r.status === "unlinked_invoice" ||
            r.status === "deviation"
          );
        }
        return r.status === statusFilter;
      })
      .filter((r) => {
        if (!term) return true;
        return [
          r.partnerName,
          r.label,
          r.projectReference,
          r.projectLabel,
          r.customerName,
          r.invoiceNumber,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term));
      });
  }, [data?.rows, statusFilter, search]);

  /** Gegroepeerd per partner, binnen de groep gesorteerd op datum (nieuwste eerst). */
  const partnerGroups = useMemo(() => {
    const map = new Map<string, { partnerId: string; partnerName: string; rows: ReconRow[] }>();
    for (const row of rows) {
      const key = row.partnerId || row.partnerName || "onbekend";
      if (!map.has(key)) {
        map.set(key, { partnerId: row.partnerId, partnerName: row.partnerName, rows: [] });
      }
      map.get(key)!.rows.push(row);
    }

    const groups = Array.from(map.values()).map((group) => {
      const sorted = [...group.rows].sort((a, b) => {
        const da = rowDate(a);
        const db = rowDate(b);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db.localeCompare(da);
      });
      return {
        ...group,
        rows: sorted,
        commissionAtRisk: sorted.reduce((sum, r) => sum + (r.commissionAtRisk || 0), 0),
        latestDate: rowDate(sorted[0]) ?? null,
      };
    });

    // Partners met de meest recente activiteit bovenaan; naam als tiebreaker.
    return groups.sort((a, b) => {
      if (a.latestDate && b.latestDate && a.latestDate !== b.latestDate) {
        return b.latestDate.localeCompare(a.latestDate);
      }
      if (a.latestDate && !b.latestDate) return -1;
      if (!a.latestDate && b.latestDate) return 1;
      return a.partnerName.localeCompare(b.partnerName, "nl");
    });
  }, [rows]);

  const summary = data?.summary;


  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-destructive">
          Kon de reconciliatie niet laden:{" "}
          {error instanceof Error ? error.message : "onbekende fout"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Factuur ontbreekt</p>
              <p className="text-2xl font-bold">{summary?.missingInvoice ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Link2Off className="h-6 w-6 text-amber-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Niet gekoppeld</p>
              <p className="text-2xl font-bold">{summary?.unlinkedInvoice ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Scale className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Afwijkingen</p>
              <p className="text-2xl font-bold">{summary?.deviation ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Euro className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Commissie in risico</p>
              <p className="text-2xl font-bold">{euro(summary?.commissionAtRisk ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Match verkoop ↔ inkoop</CardTitle>
              <p className="text-sm text-muted-foreground">
                Vergelijkt wat wij verkochten met de inkoopfacturen die partners indienden.
                {data?.settings && (
                  <>
                    {" "}
                    Tolerantie: {euro(data.settings.toleranceEur)} of{" "}
                    {data.settings.tolerancePct}%.
                  </>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek partner, project of factuur"
                className="w-56"
              />
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Alleen actiepunten</SelectItem>
                  <SelectItem value="all">Alles</SelectItem>
                  <SelectItem value="missing_invoice">Factuur ontbreekt</SelectItem>
                  <SelectItem value="unlinked_invoice">Niet gekoppeld</SelectItem>
                  <SelectItem value="deviation">Afwijking</SelectItem>
                  <SelectItem value="match">Match</SelectItem>
                  <SelectItem value="exempt">Commissievrij</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-3" />
              <p className="font-medium">Geen openstaande verschillen</p>
              <p className="text-sm text-muted-foreground">
                Verkoop en inkoop lopen voor deze selectie gelijk.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Project / onderdeel</TableHead>
                  <TableHead className="text-right">Verkoop ex btw</TableHead>
                  <TableHead className="text-right">Inkoop ex btw</TableHead>
                  <TableHead className="text-right">Verschil</TableHead>
                  <TableHead className="text-right">Commissie</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead className="text-right">Actie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const meta = statusMeta[row.status];
                  return (
                    <TableRow key={row.key}>
                      <TableCell>
                        <Badge variant="secondary" className={meta.className} title={meta.description}>
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{row.partnerName}</TableCell>
                      <TableCell>
                        <div className="text-sm">{row.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.projectReference ?? "Geen project"}
                          {row.invoiceNumber ? ` · factuur ${row.invoiceNumber}` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{euro(row.salesExclVat)}</TableCell>
                      <TableCell className="text-right">{euro(row.purchaseExclVat)}</TableCell>
                      <TableCell
                        className={`text-right ${
                          row.differenceExclVat && Math.abs(row.differenceExclVat) > 0.005
                            ? "text-orange-700 font-medium"
                            : ""
                        }`}
                      >
                        {euro(row.differenceExclVat)}
                      </TableCell>
                      <TableCell className="text-right">
                        {euro(row.commissionAtRisk)}
                        <span className="text-xs text-muted-foreground block">
                          {row.commissionPercentage}%
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {shortDate(row.executionDate ?? row.invoiceDate)}
                        {row.ageDays !== null && row.ageDays !== undefined && (
                          <span className="block text-xs">{row.ageDays} dgn</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {row.status === "missing_invoice" && row.itemId && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={billOnSales.isPending}
                              onClick={() => billOnSales.mutate(row)}
                            >
                              <Euro className="h-3.5 w-3.5 mr-1" />
                              Op verkoopwaarde
                            </Button>
                          )}
                          {row.status === "unlinked_invoice" && row.invoiceId && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={markExempt.isPending}
                              onClick={() => markExempt.mutate(row)}
                            >
                              <ShieldOff className="h-3.5 w-3.5 mr-1" />
                              Commissievrij
                            </Button>
                          )}
                          {row.projectId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/admin/projecten/${row.projectId}`)}
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CommissionReconciliationPanel;
