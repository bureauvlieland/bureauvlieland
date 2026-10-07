import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Archive,
  ArchiveRestore,
  Ban,
  Clock,
  FileText,
  Hourglass,
  Loader2,
  Scale,
  Search,
  TrendingUp,
  Link2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState, LoadingState, Notice, Pill } from "@/components/system";
import { useToast } from "@/hooks/use-toast";
import {
  basisAmountForBasis,
  commissionForBasis,
  type CommissionBasis,
  type ReconRow,
} from "@/lib/commissionReconciliation";
import {
  WORKLIST_EMPTY,
  WORKLIST_SORT_LABELS,
  WORKLIST_TABS,
  WORKLIST_TAB_LABELS,
  ageLabel,
  canChooseBasis,
  commissionExplanation,
  groupWorklistRows,
  matchesWorklistSearch,
  rowPills,
  rowsForTab,
  tabTotals,
  type WorklistSort,
  type WorklistTab,
} from "@/lib/commissionWorklistView";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);

const formatDate = (value: string | null) =>
  value ? format(parseISO(value), "EEE d MMM yyyy", { locale: nl }) : "Geen datum";

const TYPE_LABELS: Record<ReconRow["itemType"], string> = {
  activity: "Programma",
  accommodation: "Logies",
  purchase_invoice: "Losse inkoopfactuur",
};

const TAB_ICONS: Record<WorklistTab, typeof Clock> = {
  billable: FileText,
  in_draft: Hourglass,
  expected: Clock,
  deviation: TrendingUp,
  unknown_base: Scale,
  exempt: Ban,
};

interface CommissionWorklistProps {
  /** Optioneel: alleen regels van deze partner tonen. */
  partnerId?: string | null;
}

/**
 * De commissiewerklijst: alle gerealiseerde partnerregels (met of zonder
 * inkoopfactuur) plus losse inkoopfacturen, per partner en project. Tegels
 * zijn de tabs; per partner één knop "Factuur maken"; per regel de pills die
 * zeggen wat er aan de hand is.
 */
export function CommissionWorklist({ partnerId }: CommissionWorklistProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<WorklistTab>("billable");
  const [sort, setSort] = useState<WorklistSort>("age");
  const [onlyWithInvoice, setOnlyWithInvoice] = useState(false);
  const [exemptDialogOpen, setExemptDialogOpen] = useState(false);
  const [exemptReason, setExemptReason] = useState("");
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

  const basisFor = (row: ReconRow): CommissionBasis => basisOverrides[row.key] ?? row.defaultBasis;

  const allRows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const totals = useMemo(() => tabTotals(allRows, basisFor), [allRows, basisOverrides]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    let list = rowsForTab(allRows, tab);
    if (search.trim()) list = list.filter((row) => matchesWorklistSearch(row, search));
    if (onlyWithInvoice) list = list.filter((row) => row.purchaseExclVat !== null);
    return list;
  }, [allRows, tab, search, onlyWithInvoice]);

  const groups = useMemo(() => groupWorklistRows(rows, sort, basisFor), [rows, sort, basisOverrides]); // eslint-disable-line react-hooks/exhaustive-deps

  const rowByKey = useMemo(() => new Map(rows.map((row) => [row.key, row])), [rows]);
  const selectedRows = useMemo(
    () => [...selected].map((key) => rowByKey.get(key)).filter((row): row is ReconRow => !!row),
    [selected, rowByKey],
  );
  const selectedTotal = selectedRows.reduce((sum, row) => sum + commissionForBasis(row, basisFor(row)), 0);

  const changeTab = (next: WorklistTab) => {
    setTab(next);
    setSelected(new Set());
  };

  const toggleRow = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleRows = (groupRows: ReconRow[]) => {
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

  const exemptMutation = useMutation({
    mutationFn: async ({ exempt, reason }: { exempt: boolean; reason: string }) => {
      const payload = selectedRows
        .map((row) => {
          const id = row.itemType === "purchase_invoice" ? row.invoiceId : row.itemId;
          return id ? { type: row.itemType, id } : null;
        })
        .filter(Boolean);
      const { data, error } = await supabase.functions.invoke("set-commission-exempt", {
        body: { rows: payload, exempt, reason },
      });
      if (error) throw error;
      if ((data as { error?: string } | null)?.error) {
        throw new Error((data as { error: string }).error);
      }
      return data as { updated: number; todosClosed: number };
    },
    onSuccess: (result, variables) => {
      toast({
        title: variables.exempt ? "Commissievrij gemarkeerd" : "Teruggezet in de werklijst",
        description: variables.exempt
          ? `${result.updated} regel(s) commissievrij${result.todosClosed ? `, ${result.todosClosed} taak/taken gesloten` : ""}.`
          : `${result.updated} regel(s) weer actief.`,
      });
      setSelected(new Set());
      setExemptDialogOpen(false);
      setExemptReason("");
      queryClient.invalidateQueries({ queryKey: ["commission-worklist"] });
      queryClient.invalidateQueries({ queryKey: ["admin-todos"] });
    },
    onError: (err: Error) => {
      toast({ title: "Actie mislukt", description: err.message, variant: "destructive" });
    },
  });

  /** Naar "Commissiefactuur maken" met precies deze regels. */
  const createInvoice = (invoiceRows: ReconRow[]) => {
    if (invoiceRows.length === 0) return;
    const partnerIds = new Set(invoiceRows.map((row) => row.partnerId));
    if (partnerIds.size > 1) {
      toast({
        title: "Eén partner per factuur",
        description: "Selecteer alleen regels van dezelfde partner.",
        variant: "destructive",
      });
      return;
    }
    const params = new URLSearchParams();
    const itemIds = invoiceRows.filter((r) => r.itemType === "activity" && r.itemId).map((r) => r.itemId as string);
    const quoteIds = invoiceRows.filter((r) => r.itemType === "accommodation" && r.itemId).map((r) => r.itemId as string);
    const invoiceIds = invoiceRows
      .filter((r) => r.itemType === "purchase_invoice" && r.invoiceId)
      .map((r) => r.invoiceId as string);
    if (itemIds.length) params.set("itemIds", itemIds.join(","));
    if (quoteIds.length) params.set("quoteIds", quoteIds.join(","));
    if (invoiceIds.length) params.set("invoiceIds", invoiceIds.join(","));
    const basisMap = invoiceRows.map((row) => `${row.itemId ?? row.invoiceId}:${basisFor(row)}`).join(",");
    if (basisMap) params.set("basis", basisMap);
    // Grondslag meegeven zodat de factuurpagina kan waarschuwen bij afwijkingen.
    const amountsMap = invoiceRows
      .map((row) => `${row.itemId ?? row.invoiceId}:${basisAmountForBasis(row, basisFor(row)).toFixed(2)}`)
      .join(",");
    if (amountsMap) params.set("amounts", amountsMap);
    navigate(`/admin/commissies/factuur-maken?${params.toString()}`);
  };

  if (isLoading) return <LoadingState label="Werklijst laden…" />;

  if (error) {
    return (
      <Notice tone="danger" title="Kon de werklijst niet laden">
        {(error as Error).message}
      </Notice>
    );
  }

  const canInvoice = tab === "billable" || tab === "deviation";
  const isFiltering = search.trim().length > 0 || onlyWithInvoice;

  return (
    <div className="space-y-5">
      {/* Tegels = tabs */}
      <div role="tablist" aria-label="Commissiestatus" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {WORKLIST_TABS.map((key) => {
          const active = key === tab;
          const Icon = TAB_ICONS[key];
          const total = totals[key];
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => changeTab(key)}
              className={`rounded-lg border p-3 text-left transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4 ${
                active ? "border-primary bg-accent-soft" : "bg-card hover:bg-muted"
              }`}
            >
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4" aria-hidden="true" />
                {WORKLIST_TAB_LABELS[key]}
              </span>
              <span className="mt-1 block text-2xl font-semibold tabular-nums text-foreground">{total.count}</span>
              <span className="block text-xs text-muted-foreground">
                {key === "exempt" ? "zonder commissie" : formatCurrency(total.amount)}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "deviation" && (
        <Notice tone="info" title="Partner factureerde meer dan wij verkochten">
          De commissie gaat over de inkoopfactuur, dus deze regels staan ook bij "Te factureren". Het
          verschil is een signaal voor de nacalculatie van het project, niet voor de commissie.
        </Notice>
      )}
      {tab === "unknown_base" && rows.length > 0 && (
        <Notice tone="warning" title="Geen verkoopprijs en geen inkoopfactuur">
          Deze regels zijn niet te factureren: er is niets om over te rekenen. Vul de prijs aan op het
          onderdeel of registreer de inkoopfactuur van de partner.
        </Notice>
      )}

      {/* Zoeken, sorteren, filteren */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Zoek op partner, klant, project of factuurnummer"
            aria-label="Zoeken"
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(value) => setSort(value as WorklistSort)}>
          <SelectTrigger className="sm:w-56" aria-label="Sorteren">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(WORKLIST_SORT_LABELS) as WorklistSort[]).map((key) => (
              <SelectItem key={key} value={key}>
                {WORKLIST_SORT_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={onlyWithInvoice} onCheckedChange={(checked) => setOnlyWithInvoice(checked === true)} />
          Alleen met inkoopfactuur
        </label>
      </div>

      {/* Selectiebalk */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-accent-soft p-3">
          <span className="text-sm text-foreground">
            <strong>{selected.size}</strong> geselecteerd · {formatCurrency(selectedTotal)} commissie
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            {canInvoice && (
              <Button onClick={() => createInvoice(selectedRows)}>
                <FileText className="h-4 w-4" />
                Factuur maken ({selected.size})
              </Button>
            )}
            {tab === "exempt" ? (
              <Button
                variant="outline"
                disabled={exemptMutation.isPending}
                onClick={() => exemptMutation.mutate({ exempt: false, reason: "" })}
              >
                <ArchiveRestore className="h-4 w-4" />
                Terugzetten
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setExemptDialogOpen(true)}>
                <Archive className="h-4 w-4" />
                Commissievrij markeren
              </Button>
            )}
            <Button variant="ghost" onClick={() => setSelected(new Set())}>
              Selectie wissen
            </Button>
          </div>
        </div>
      )}

      {groups.length === 0 && (
        <EmptyState
          icon={<FileText />}
          title={isFiltering ? "Niets gevonden" : WORKLIST_EMPTY[tab].title}
          description={isFiltering ? "Geen regels die aan je zoekopdracht of filter voldoen." : WORKLIST_EMPTY[tab].description}
          action={
            isFiltering ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setOnlyWithInvoice(false);
                }}
              >
                Filters wissen
              </Button>
            ) : undefined
          }
        />
      )}

      {groups.map((group) => {
        const groupSelected = group.rows.filter((row) => selected.has(row.key));
        const allSelected = groupSelected.length === group.rows.length;
        const invoiceRows = groupSelected.length > 0 ? groupSelected : group.rows;
        return (
          <Card key={group.partnerId}>
            <CardContent className="p-0">
              {/* Partnerkop */}
              <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={allSelected ? true : groupSelected.length > 0 ? "indeterminate" : false}
                    onCheckedChange={() => toggleRows(group.rows)}
                    aria-label={`Alle regels van ${group.partnerName} selecteren`}
                  />
                  <div>
                    <h3 className="font-semibold text-foreground">
                      <Link to={`/admin/partners/${group.partnerId}`} className="hover:underline">
                        {group.partnerName}
                      </Link>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {group.rows.length} regel{group.rows.length === 1 ? "" : "s"} ·{" "}
                      {group.projects.length} project{group.projects.length === 1 ? "" : "en"}
                      {group.maxAgeDays > 0 && ` · oudste ${ageLabel(group.maxAgeDays)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:text-right">
                  <div>
                    <p className="text-xs text-muted-foreground">Commissie</p>
                    <p className="text-xl font-semibold tabular-nums text-foreground">{formatCurrency(group.total)}</p>
                  </div>
                  {canInvoice && (
                    <Button onClick={() => createInvoice(invoiceRows)}>
                      <FileText className="h-4 w-4" />
                      Factuur maken ({invoiceRows.length})
                    </Button>
                  )}
                </div>
              </div>

              {/* Projecten met hun regels */}
              <div className="divide-y">
                {group.projects.map((project) => (
                  <div key={project.key} className="px-4 py-3">
                    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="font-medium text-foreground">{project.label}</span>
                      {project.reference && <span className="text-muted-foreground">{project.reference}</span>}
                      {project.customerName && project.customerName !== project.label && (
                        <span className="text-muted-foreground">{project.customerName}</span>
                      )}
                      <span className="text-muted-foreground">
                        {formatDate(project.date)}
                        {project.ageDays !== null && project.ageDays > 0 && ` · ${ageLabel(project.ageDays)}`}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {project.rows.map((row) => {
                        const basis = basisFor(row);
                        const commission = commissionForBasis(row, basis);
                        const pills = rowPills(row);
                        return (
                          <div
                            key={row.key}
                            className={`grid grid-cols-[auto_1fr] gap-3 rounded-md border p-3 lg:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] lg:items-center ${
                              selected.has(row.key) ? "border-primary bg-accent-soft/50" : "bg-card"
                            }`}
                          >
                            <Checkbox
                              checked={selected.has(row.key)}
                              onCheckedChange={() => toggleRow(row.key)}
                              aria-label={`${row.label} selecteren`}
                              className="mt-0.5"
                            />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-foreground">{row.label}</span>
                                <span className="text-xs text-muted-foreground">{TYPE_LABELS[row.itemType]}</span>
                                {pills.map((pill) => (
                                  <Pill key={pill.label} tone={pill.tone} title={pill.title}>
                                    {pill.label}
                                  </Pill>
                                ))}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                {row.invoiceNumber && (
                                  <span className="inline-flex items-center gap-1">
                                    <Link2 className="h-3 w-3" aria-hidden="true" />
                                    Inkoopfactuur {row.invoiceNumber}
                                    {row.invoiceDate && ` · ${formatDate(row.invoiceDate)}`}
                                  </span>
                                )}
                                {row.itemType === "purchase_invoice" && (
                                  <Link
                                    to={`/admin/inkoopfacturen?search=${encodeURIComponent(row.invoiceNumber ?? "")}`}
                                    className="underline"
                                  >
                                    Koppel aan onderdeel of logies
                                  </Link>
                                )}
                              </div>
                            </div>

                            <div className="col-start-2 grid grid-cols-2 gap-x-4 text-sm lg:col-start-auto lg:text-right">
                              <div>
                                <p className="text-xs text-muted-foreground">Verkoop ex btw</p>
                                <p className="tabular-nums">
                                  {row.salesExclVat === null ? "–" : formatCurrency(row.salesExclVat)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Inkoop ex btw</p>
                                <p className="tabular-nums">
                                  {row.purchaseExclVat === null ? "–" : formatCurrency(row.purchaseExclVat)}
                                </p>
                              </div>
                            </div>

                            <div className="col-start-2 lg:col-start-auto">
                              {canChooseBasis(row) ? (
                                <ToggleGroup
                                  type="single"
                                  size="sm"
                                  value={basis}
                                  aria-label="Grondslag"
                                  onValueChange={(value) => {
                                    if (!value) return;
                                    setBasisOverrides((prev) => ({ ...prev, [row.key]: value as CommissionBasis }));
                                  }}
                                >
                                  <ToggleGroupItem value="purchase" className="px-2 text-xs">
                                    Inkoop
                                  </ToggleGroupItem>
                                  <ToggleGroupItem value="sales" className="px-2 text-xs">
                                    Verkoop
                                  </ToggleGroupItem>
                                </ToggleGroup>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Grondslag: {basis === "purchase" ? "inkoop" : "verkoop"}
                                </span>
                              )}
                            </div>

                            <div className="col-start-2 lg:col-start-auto lg:min-w-28 lg:text-right">
                              <p className="font-semibold tabular-nums text-foreground">{formatCurrency(commission)}</p>
                              <p className="text-xs text-muted-foreground">{commissionExplanation(row, basis)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {tab === "billable" && groups.length > 0 && (
        <p className="text-xs text-muted-foreground">
          De grondslag is de inkoopfactuur ex btw als die er is, anders onze verkoopwaarde ex btw. Per regel
          aanpasbaar waar beide bestaan.
        </p>
      )}

      <Dialog open={exemptDialogOpen} onOpenChange={setExemptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Commissievrij markeren</DialogTitle>
            <DialogDescription>
              {selected.size} regel(s) verdwijnen uit de actieve lijst en blijven terugvindbaar onder
              "Commissievrij". Openstaande commissietaken worden gesloten.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="exempt-reason">Reden (verplicht)</Label>
            <Textarea
              id="exempt-reason"
              value={exemptReason}
              onChange={(event) => setExemptReason(event.target.value)}
              placeholder="Bijv. afspraak zonder commissie, project geannuleerd, al via Snelstart verrekend"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExemptDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              disabled={exemptReason.trim().length < 3 || exemptMutation.isPending}
              onClick={() => exemptMutation.mutate({ exempt: true, reason: exemptReason.trim() })}
            >
              {exemptMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Markeren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
