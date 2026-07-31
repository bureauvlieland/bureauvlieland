import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  AlertTriangle,
  Check,
  FileText,
  Link2,
  Link2Off,
  Loader2,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  basisAmountForBasis,
  commissionForBasis,
  isBillableRow,
  type CommissionBasis,
  type ReconRow,
} from "@/lib/commissionReconciliation";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);

const formatDate = (value: string | null) =>
  value ? format(new Date(value), "d MMM yyyy", { locale: nl }) : "—";

const TYPE_LABELS: Record<ReconRow["itemType"], string> = {
  activity: "Programma",
  accommodation: "Logies",
  purchase_invoice: "Losse inkoopfactuur",
};

interface CommissionWorklistProps {
  /** Optioneel: alleen regels van deze partner tonen. */
  partnerId?: string | null;
}

/**
 * Eén werklijst met alle gerealiseerde partnerregels (met of zonder inkoopfactuur)
 * plus losse inkoopfacturen. Per regel kiest de admin de commissiegrondslag.
 */
export function CommissionWorklist({ partnerId }: CommissionWorklistProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [basisOverrides, setBasisOverrides] = useState<Record<string, CommissionBasis>>({});

  const { data, isLoading, error } = useQuery<{ rows: ReconRow[] }>({
    queryKey: ["commission-worklist", partnerId ?? "all"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-commission-reconciliation", {
        body: { partnerId: partnerId && partnerId !== "all" ? partnerId : null },
      });
      if (error) throw error;
      return data as { rows: ReconRow[] };
    },
  });

  const basisFor = (row: ReconRow): CommissionBasis =>
    basisOverrides[row.key] ?? row.defaultBasis;

  const rows = useMemo(() => {
    const billable = (data?.rows ?? []).filter(isBillableRow);
    const term = search.trim().toLowerCase();
    if (!term) return billable;
    return billable.filter((row) =>
      [row.label, row.partnerName, row.customerName, row.projectLabel, row.projectReference, row.invoiceNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [data?.rows, search]);

  const groups = useMemo(() => {
    const map = new Map<string, { partnerId: string; partnerName: string; rows: ReconRow[] }>();
    for (const row of rows) {
      const group = map.get(row.partnerId) ?? {
        partnerId: row.partnerId,
        partnerName: row.partnerName,
        rows: [],
      };
      group.rows.push(row);
      map.set(row.partnerId, group);
    }
    for (const group of map.values()) {
      group.rows.sort((a, b) => {
        const dateA = a.executionDate ?? a.invoiceDate ?? "";
        const dateB = b.executionDate ?? b.invoiceDate ?? "";
        return dateA.localeCompare(dateB);
      });
    }
    return [...map.values()].sort((a, b) => a.partnerName.localeCompare(b.partnerName));
  }, [rows]);

  const rowByKey = useMemo(() => new Map(rows.map((row) => [row.key, row])), [rows]);

  const selectedRows = useMemo(
    () => [...selected].map((key) => rowByKey.get(key)).filter((row): row is ReconRow => !!row),
    [selected, rowByKey],
  );

  const selectedTotal = selectedRows.reduce(
    (sum, row) => sum + commissionForBasis(row, basisFor(row)),
    0,
  );

  const toggleRow = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleGroup = (groupRows: ReconRow[]) => {
    const allSelected = groupRows.every((row) => selected.has(row.key));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const row of groupRows) {
        if (allSelected) next.delete(row.key);
        else next.add(row.key);
      }
      return next;
    });
  };

  const setGroupBasis = (groupRows: ReconRow[], basis: CommissionBasis) => {
    setBasisOverrides((prev) => {
      const next = { ...prev };
      for (const row of groupRows) next[row.key] = basis;
      return next;
    });
  };

  const createInvoice = () => {
    if (selectedRows.length === 0) return;
    const partnerIds = new Set(selectedRows.map((row) => row.partnerId));
    if (partnerIds.size > 1) {
      toast({
        title: "Eén partner per factuur",
        description: "Selecteer alleen regels van dezelfde partner.",
        variant: "destructive",
      });
      return;
    }
    const params = new URLSearchParams();
    const itemIds = selectedRows.filter((r) => r.itemType === "activity" && r.itemId).map((r) => r.itemId!);
    const quoteIds = selectedRows.filter((r) => r.itemType === "accommodation" && r.itemId).map((r) => r.itemId!);
    const invoiceIds = selectedRows
      .filter((r) => r.itemType === "purchase_invoice" && r.invoiceId)
      .map((r) => r.invoiceId!);
    if (itemIds.length) params.set("itemIds", itemIds.join(","));
    if (quoteIds.length) params.set("quoteIds", quoteIds.join(","));
    if (invoiceIds.length) params.set("invoiceIds", invoiceIds.join(","));
    const basisMap = selectedRows
      .map((row) => `${row.itemId ?? row.invoiceId}:${basisFor(row)}`)
      .join(",");
    if (basisMap) params.set("basis", basisMap);
    // Grondslag meegeven zodat de factuurpagina kan waarschuwen bij afwijkingen.
    const amountsMap = selectedRows
      .map(
        (row) =>
          `${row.itemId ?? row.invoiceId}:${basisAmountForBasis(row, basisFor(row)).toFixed(2)}`,
      )
      .join(",");
    if (amountsMap) params.set("amounts", amountsMap);

    navigate(`/admin/commissies/factuur-maken?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Werklijst laden…
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Kon de werklijst niet laden: {(error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  const missingInvoiceCount = rows.filter((row) => row.status === "missing_invoice").length;
  const unlinkedCount = rows.filter((row) => row.itemType === "purchase_invoice").length;
  const deviationCount = rows.filter((row) => row.status === "deviation").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zonder inkoopfactuur
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{missingInvoiceCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Losse inkoopfacturen
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{unlinkedCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Verkoop ≠ inkoop
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{deviationCount}</CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Zoek op partner, klant, project of factuurnummer"
            className="pl-9"
          />
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {selected.size} geselecteerd · {formatCurrency(selectedTotal)} commissie
            </span>
            <Button onClick={createInvoice}>
              <FileText className="h-4 w-4 mr-2" />
              Commissiefactuur maken
            </Button>
          </div>
        )}
      </div>

      {groups.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Geen regels om te factureren.
          </CardContent>
        </Card>
      )}

      {groups.map((group) => {
        const groupTotal = group.rows.reduce(
          (sum, row) => sum + commissionForBasis(row, basisFor(row)),
          0,
        );
        const allSelected = group.rows.every((row) => selected.has(row.key));
        return (
          <Card key={group.partnerId}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
              <div className="flex items-center gap-3">
                <Checkbox checked={allSelected} onCheckedChange={() => toggleGroup(group.rows)} />
                <div>
                  <CardTitle className="text-base">{group.partnerName}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {group.rows.length} regel(s) · {formatCurrency(groupTotal)} commissie
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Grondslag:</span>
                <Button variant="outline" size="sm" onClick={() => setGroupBasis(group.rows, "sales")}>
                  Verkoop
                </Button>
                <Button variant="outline" size="sm" onClick={() => setGroupBasis(group.rows, "purchase")}>
                  Inkoop
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="w-10 p-3" />
                      <th className="p-3 text-left">Onderdeel</th>
                      <th className="p-3 text-left">Klant / project</th>
                      <th className="p-3 text-left">Datum</th>
                      <th className="p-3 text-left">Inkoopfactuur</th>
                      <th className="p-3 text-right">Verkoop ex btw</th>
                      <th className="p-3 text-right">Inkoop ex btw</th>
                      <th className="p-3 text-center">Grondslag</th>
                      <th className="p-3 text-right">Commissie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => {
                      const basis = basisFor(row);
                      const commission = commissionForBasis(row, basis);
                      const basisAmount = basisAmountForBasis(row, basis);
                      return (
                        <tr key={row.key} className="border-t hover:bg-muted/30">
                          <td className="p-3">
                            <Checkbox
                              checked={selected.has(row.key)}
                              onCheckedChange={() => toggleRow(row.key)}
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-medium">{row.label}</div>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {TYPE_LABELS[row.itemType]}
                            </Badge>
                            {row.itemType === "purchase_invoice" && (
                              <Button
                                variant="link"
                                size="sm"
                                className="mt-1 block h-auto p-0 text-xs"
                                onClick={() =>
                                  navigate(
                                    `/admin/inkoopfacturen?search=${encodeURIComponent(row.invoiceNumber ?? "")}`,
                                  )
                                }
                              >
                                Koppel aan onderdeel of logies
                              </Button>
                            )}
                          </td>

                          <td className="p-3">
                            <div>{row.projectLabel ?? "—"}</div>
                            {row.customerName && row.customerName !== row.projectLabel && (
                              <div className="text-xs text-muted-foreground">{row.customerName}</div>
                            )}
                            {row.projectReference && (
                              <div className="text-xs text-muted-foreground">{row.projectReference}</div>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {formatDate(row.executionDate ?? row.invoiceDate)}
                          </td>
                          <td className="p-3">
                            {row.invoiceNumber ? (
                              <span className="inline-flex items-center gap-1 text-xs">
                                <Link2 className="h-3 w-3 text-emerald-600" />
                                {row.invoiceNumber}
                              </span>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                    <Link2Off className="h-3 w-3" />
                                    Ontbreekt
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Nog geen inkoopfactuur geregistreerd — commissie loopt via verkoopwaarde.
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </td>
                          <td className="p-3 text-right tabular-nums">
                            {row.salesExclVat === null ? "—" : formatCurrency(row.salesExclVat)}
                          </td>
                          <td className="p-3 text-right tabular-nums">
                            {row.purchaseExclVat === null ? (
                              "—"
                            ) : (
                              <span
                                className={
                                  row.status === "deviation" ? "text-amber-600 font-medium" : undefined
                                }
                              >
                                {formatCurrency(row.purchaseExclVat)}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <ToggleGroup
                              type="single"
                              size="sm"
                              value={basis}
                              onValueChange={(value) => {
                                if (!value) return;
                                setBasisOverrides((prev) => ({
                                  ...prev,
                                  [row.key]: value as CommissionBasis,
                                }));
                              }}
                            >
                              <ToggleGroupItem value="sales" className="px-2 text-xs">
                                Verkoop
                              </ToggleGroupItem>
                              <ToggleGroupItem
                                value="purchase"
                                className="px-2 text-xs"
                                disabled={row.purchaseExclVat === null}
                              >
                                Inkoop
                              </ToggleGroupItem>
                            </ToggleGroup>
                          </td>
                          <td className="p-3 text-right tabular-nums font-medium">
                            {formatCurrency(commission)}
                            <div className="text-xs text-muted-foreground">
                              {row.commissionPercentage}% van {formatCurrency(basisAmount)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {rows.length > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Check className="h-3 w-3" />
          Standaard rekent de lijst met de inkoopfactuur wanneer die bekend is, anders met onze
          verkoopwaarde. Per regel of per partner aanpasbaar.
        </p>
      )}
    </div>
  );
}
