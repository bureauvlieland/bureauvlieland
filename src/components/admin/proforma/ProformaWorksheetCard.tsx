import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, LoadingState, Notice, Pill } from "@/components/system";
import { ChevronDown, ChevronRight, FileText, Loader2, MoreHorizontal, Plus, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { Proforma, ProformaLine } from "@/lib/proforma";
import { totalsFromProformaLines } from "@/lib/proforma";
import {
  candidateStatusLabel,
  changesFromDestinations,
  isReplaceableQuoteLine,
  replaceCandidates,
  itemFigures,
  orderProformaLines,
  originLabel,
  proposeDestinations,
  sectionsOf,
  worksheetPurchaseLines,
  type Destination,
  type WorksheetInvoice,
  type WorksheetItem,
  type WorksheetPurchaseLine,
} from "@/lib/proformaWorksheet";
import { usePurchaseInvoicesByRequest } from "@/hooks/usePurchaseInvoices";
import {
  useApplyLodgingLines,
  useCreateLinesFromInvoice,
  useLodgingQuotesForProject,
  usePurchaseInvoiceLinesByRequest,
  type LodgingLineDecision,
  type PurchaseInvoiceLineRow,
} from "@/hooks/usePurchaseInvoiceLines";
import { useApplyProformaChanges, useManualProformaLines, type ManualLineInput } from "@/hooks/useProformaChanges";
import { lodgingExtraCategory } from "@/lib/purchaseLineMatcher";
import { invoiceTypeLabels, type BureauInvoice } from "@/types/bureauInvoice";
import { useInvoiceCustomerSendStatus } from "@/hooks/useInvoiceCustomerSendStatus";
import type { PurchaseInvoiceWithRelations } from "@/types/purchaseInvoice";

const formatCurrency = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

interface ProformaWorksheetCardProps {
  requestId: string;
  proforma: Proforma | null;
  lines: ProformaLine[];
  loading: boolean;
  busy: boolean;
  isAccepted: boolean;
  canCreate: boolean;
  onCreate: () => void;
  /** Na elke schrijfactie: proforma en project opnieuw laden. */
  onChanged: () => void;
  items: WorksheetItem[];
  numberOfPeople: number;
  selectedDates: string[];
  bureauInvoices: BureauInvoice[];
  onRegisterInvoice: () => void;
  /** Fase 3: de proforma is als eindfactuur geregistreerd en bevroren. */
  isRegistered?: boolean;
  /** Doorsturen naar de boekhouding (opent het voorbeeld met de doorstuurdialoog). */
  onForwardInvoice?: (invoice: BureauInvoice) => void;
}

/** Bestemming van een open inkoopregel in het werkblad. */
type Draft = Destination;

const draftValue = (d: Draft | undefined): string => {
  if (!d) return "";
  switch (d.kind) {
    case "replace":
      return `replace:${d.lineId}`;
    case "add":
      return "add";
    case "keep":
      return "keep";
    case "lodging":
      return `lodging:${d.target}:${d.quoteId}`;
  }
};

const draftFromValue = (value: string, reason: string | null): Draft | null => {
  if (value === "add") return { kind: "add" };
  if (value === "keep") return { kind: "keep", reason };
  if (value.startsWith("replace:")) return { kind: "replace", lineId: value.slice("replace:".length) };
  if (value.startsWith("lodging:")) {
    const [, target, quoteId] = value.split(":");
    return { kind: "lodging", quoteId, target: target as "room" | "extra" };
  }
  return null;
};

/**
 * Fase 2 van docs/plan-proforma-factuur.md: het werkblad is de proforma zelf.
 * Boven de factuur zoals de klant hem krijgt, met per regel de herkomst en
 * een menu; daaronder de inkoopregels die er nog niet op staan, met het
 * voorstel van de matcher. Alles schrijft via `apply_proforma_changes`.
 */
export function ProformaWorksheetCard({
  requestId,
  proforma,
  lines,
  loading,
  busy,
  isAccepted,
  canCreate,
  onCreate,
  onChanged,
  items,
  numberOfPeople,
  selectedDates,
  bureauInvoices,
  onRegisterInvoice,
  isRegistered = false,
  onForwardInvoice,
}: ProformaWorksheetCardProps) {
  const { data: customerSendMap = {} } = useInvoiceCustomerSendStatus(
    requestId,
    bureauInvoices.map((i) => i.id),
  );
  const navigate = useNavigate();
  const { invoices, isLoading: invoicesLoading } = usePurchaseInvoicesByRequest(requestId);
  const { data: purchaseRows, isLoading: purchaseLoading } = usePurchaseInvoiceLinesByRequest(requestId);
  const { data: lodgingQuotes } = useLodgingQuotesForProject(requestId);
  const apply = useApplyProformaChanges(requestId);
  const applyLodging = useApplyLodgingLines();
  const createLines = useCreateLinesFromInvoice();
  const manual = useManualProformaLines();

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [keepReasons, setKeepReasons] = useState<Record<string, string>>({});
  const [showKept, setShowKept] = useState(false);
  const [showHidden, setShowHidden] = useState(true);
  const [replaceFor, setReplaceFor] = useState<ProformaLine | null>(null);
  const [replaceChecked, setReplaceChecked] = useState<Record<string, boolean>>({});
  const [hideFor, setHideFor] = useState<ProformaLine | null>(null);
  const [hideReason, setHideReason] = useState("");
  const [renameFor, setRenameFor] = useState<ProformaLine | null>(null);
  const [renameText, setRenameText] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualInput, setManualInput] = useState<ManualLineInput>({ description: "", quantity: 1, unit_price_excl_vat: 0, vat_rate: 21 });
  const [working, setWorking] = useState(false);

  const invoiceById = useMemo(
    () => new Map<string, PurchaseInvoiceWithRelations>((invoices ?? []).map((inv) => [inv.id, inv])),
    [invoices],
  );
  const worksheetInvoices = useMemo<WorksheetInvoice[]>(
    () =>
      (invoices ?? []).map((inv) => ({
        id: inv.id,
        partner_id: inv.partner_id ?? null,
        partner_name: inv.partner?.name ?? null,
        invoice_number: inv.invoice_number ?? null,
        amount_incl_vat: Number(inv.amount_incl_vat ?? 0),
        billed_to: inv.billed_to ?? null,
        allocated_item_ids: (inv.allocations ?? []).map((a) => a.item_id),
      })),
    [invoices],
  );
  const purchaseLines = useMemo<WorksheetPurchaseLine[]>(
    () =>
      (purchaseRows ?? []).map((l) => ({
        id: l.id,
        invoice_id: l.invoice_id,
        description: l.description,
        quantity: Number(l.quantity) || 1,
        amount_excl_vat: Number(l.amount_excl_vat),
        vat_rate: Number(l.vat_rate),
        amount_incl_vat: Number(l.amount_incl_vat),
        charge_status: l.charge_status,
        skip_reason: l.skip_reason,
        item_id: l.item_id,
        lodging_quote_id: l.lodging_quote_id,
        request_id: l.request_id,
      })),
    [purchaseRows],
  );
  const purchaseRowById = useMemo(() => new Map((purchaseRows ?? []).map((l) => [l.id, l])), [purchaseRows]);

  const ordered = useMemo(() => orderProformaLines(lines), [lines]);
  const sections = useMemo(() => sectionsOf(ordered), [ordered]);
  const state = useMemo(() => worksheetPurchaseLines(purchaseLines, lines, worksheetInvoices), [purchaseLines, lines, worksheetInvoices]);
  const replaceable = useMemo(() => ordered.filter(isReplaceableQuoteLine), [ordered]);
  const proposals = useMemo(
    () =>
      new Map(
        proposeDestinations({
          openLines: state.open,
          invoices: worksheetInvoices,
          proformaLines: lines,
          items,
          numberOfPeople,
          selectedDates,
          lodgingQuotes: lodgingQuotes ?? [],
        }).map((p) => [p.purchaseLineId, p]),
      ),
    [state.open, worksheetInvoices, lines, items, numberOfPeople, selectedDates, lodgingQuotes],
  );

  // Voorstellen worden het concept; zekere voorstellen staan aangevinkt.
  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const line of state.open) {
        if (next[line.id]) continue;
        const p = proposals.get(line.id);
        if (p) next[line.id] = p.destination;
      }
      return next;
    });
    setChecked((prev) => {
      const next = { ...prev };
      for (const line of state.open) {
        if (line.id in next) continue;
        const p = proposals.get(line.id);
        next[line.id] = !!p?.sure;
      }
      return next;
    });
  }, [state.open, proposals]);

  const invoicesWithoutLines = useMemo(
    () => (invoices ?? []).filter((inv) => inv.request_id === requestId && !purchaseLines.some((l) => l.invoice_id === inv.id)),
    [invoices, purchaseLines, requestId],
  );

  const totals = useMemo(() => totalsFromProformaLines(lines), [lines]);
  const invoiced = bureauInvoices.reduce(
    (s, inv) => s + (inv.invoice_type === "credit" ? -Number(inv.amount_incl_vat) : Number(inv.amount_incl_vat)),
    0,
  );
  const outstanding = Math.round((totals.inclVat - invoiced) * 100) / 100;
  const openTotal = state.open.reduce((s, l) => s + l.amount_incl_vat, 0);
  const toConfirm = state.open.filter((l) => checked[l.id] && drafts[l.id]);

  const run = async (fn: () => Promise<void>) => {
    setWorking(true);
    try {
      await fn();
      onChanged();
    } catch {
      // De hooks melden de fout zelf.
    } finally {
      setWorking(false);
    }
  };

  const handleConfirm = () =>
    run(async () => {
      const lodging: LodgingLineDecision[] = [];
      const plain: Array<{ purchaseLineId: string; destination: Destination }> = [];
      for (const line of toConfirm) {
        const draft = drafts[line.id];
        if (draft.kind === "lodging") {
          const row = purchaseRowById.get(line.id);
          if (row) lodging.push({ line: row, quoteId: draft.quoteId, target: draft.target, category: lodgingExtraCategory(line.description) });
        } else if (draft.kind === "keep") {
          plain.push({ purchaseLineId: line.id, destination: { kind: "keep", reason: keepReasons[line.id] ?? draft.reason } });
        } else {
          plain.push({ purchaseLineId: line.id, destination: draft });
        }
      }
      const parts: string[] = [];
      if (lodging.length > 0) {
        const meta: Record<string, { partner_id: string | null; invoice_number: string | null }> = {};
        for (const d of lodging) {
          const inv = invoiceById.get(d.line.invoice_id);
          meta[d.line.invoice_id] = { partner_id: inv?.partner_id ?? null, invoice_number: inv?.invoice_number ?? null };
        }
        await applyLodging.mutateAsync({ decisions: lodging, invoices: meta });
        parts.push(`${lodging.length} op logies`);
      }
      const changes = changesFromDestinations(plain);
      if (changes.length > 0) {
        const result = await apply.mutateAsync(changes);
        if (result.replaced > 0) parts.push(`${result.replaced} vervangt een offerteregel`);
        if (result.added > 0) parts.push(`${result.added} als eigen regel`);
        if (result.kept > 0) parts.push(`${result.kept} gelaten`);
      }
      toast.success(`Verwerkt: ${parts.join(", ") || "niets gewijzigd"}`);
      setChecked({});
      setDrafts({});
    });

  const handleReplaceConfirm = () =>
    run(async () => {
      if (!replaceFor) return;
      const ids = Object.entries(replaceChecked).filter(([, v]) => v).map(([id]) => id);
      if (ids.length === 0) return;
      await apply.mutateAsync([{ action: "replace", line_id: replaceFor.id, purchase_line_ids: ids }]);
      toast.success(`${ids.length === 1 ? "Inkoopregel" : `${ids.length} inkoopregels`} in de plaats van “${replaceFor.description}”`);
      setReplaceFor(null);
      setReplaceChecked({});
    });

  const handleRevert = (line: ProformaLine) =>
    run(async () => {
      await apply.mutateAsync([{ action: "revert", line_id: line.id }]);
      toast.success("Teruggedraaid; de inkoopregel staat weer bij “Nog niet op de factuur”");
    });

  const handleHideConfirm = () =>
    run(async () => {
      if (!hideFor) return;
      await apply.mutateAsync([{ action: "hide", line_id: hideFor.id, reason: hideReason.trim() || null }]);
      toast.success(`“${hideFor.description}” staat niet meer op de factuur`);
      setHideFor(null);
      setHideReason("");
    });

  const handleUnhide = (line: ProformaLine) =>
    run(async () => {
      await apply.mutateAsync([{ action: "unhide", line_id: line.id }]);
      toast.success(`“${line.description}” staat weer op de factuur`);
    });

  const handleReopen = (line: WorksheetPurchaseLine) =>
    run(async () => {
      await apply.mutateAsync([{ action: "reopen", purchase_line_id: line.id }]);
    });

  const handleRenameConfirm = () =>
    run(async () => {
      if (!renameFor) return;
      await manual.rename.mutateAsync({ lineId: renameFor.id, description: renameText });
      setRenameFor(null);
    });

  const handleManualAdd = () =>
    run(async () => {
      if (!proforma) return;
      await manual.add.mutateAsync({ proformaId: proforma.id, input: manualInput, sortOrder: lines.length + 1 });
      toast.success("Regel toegevoegd");
      setManualOpen(false);
      setManualInput({ description: "", quantity: 1, unit_price_excl_vat: 0, vat_rate: 21 });
    });

  const handleManualRemove = (line: ProformaLine) =>
    run(async () => {
      await manual.remove.mutateAsync(line.id);
      toast.success("Regel verwijderd");
    });

  // Een kostenpost (onderdeel op dag −1) die niets meer draagt: weg uit het
  // programma én van de proforma. Met inkoopregels erop eerst terugdraaien.
  const handleRemoveCostPost = (line: ProformaLine) =>
    run(async () => {
      if (!line.item_id) return;
      const { error: linesError } = await supabase.from("project_proforma_lines").delete().eq("id", line.id);
      if (linesError) throw linesError;
      const { error } = await supabase.from("program_request_items").delete().eq("id", line.item_id);
      if (error) throw error;
      toast.success(`Kostenpost “${line.description}” verwijderd`);
    });
  const isEmptyCostPost = (line: ProformaLine) =>
    line.origin === "quote_item" &&
    line.kind === "cost" &&
    !!line.item_id &&
    items.find((it) => it.id === line.item_id)?.day_index === -1 &&
    !lines.some((l) => l.replaces_line_id === line.id && l.line_status === "active");

  const isBusy = busy || working || apply.isPending || applyLodging.isPending || isRegistered;
  const registeredInvoice = proforma?.registered_invoice_id
    ? bureauInvoices.find((inv) => inv.id === proforma.registered_invoice_id) ?? null
    : null;

  // ── Weergave ──────────────────────────────────────────────────────────────

  const renderLine = (line: ProformaLine) => {
    const isPurchase = line.origin === "purchase_line";
    const isReplaced = line.line_status === "replaced";
    const isHidden = line.line_status === "hidden";
    if (isHidden && !showHidden) return null;
    const figures = line.item_id && line.origin === "quote_item" && line.kind !== "sub" ? itemFigures(line, lines, purchaseLines) : null;
    const showFigures = figures && (figures.purchase != null || isReplaced);
    return (
      <div
        key={line.id}
        className={cn(
          "grid grid-cols-[1fr_auto_auto] items-start gap-x-3 gap-y-0.5 px-3 py-2 text-sm border-b border-border/60 last:border-b-0",
          isPurchase && line.replaces_line_id && "pl-8 bg-accent-soft/30",
          isHidden && "opacity-60",
        )}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={cn("font-medium", isReplaced && "line-through text-muted-foreground")}>{line.description}</span>
            <Pill tone={isPurchase ? "success" : line.origin === "manual" ? "info" : "neutral"} size="sm">
              {originLabel(line)}
            </Pill>
            {isReplaced && <Pill tone="warning" size="sm">Vervangen</Pill>}
            {isHidden && (
              <Pill tone="neutral" size="sm" title={line.hidden_reason ?? undefined}>
                Niet op de factuur{line.hidden_reason ? `: ${line.hidden_reason}` : ""}
              </Pill>
            )}
          </div>
          {line.sub_description && <p className="text-xs text-muted-foreground">{line.sub_description}</p>}
          {showFigures && figures && (
            <p className="text-xs text-muted-foreground tabular-nums">
              Offerte {formatCurrency(figures.quote)}
              {figures.purchase != null && <> · Inkoop {formatCurrency(figures.purchase)}</>}
              {" · "}Factuur {formatCurrency(figures.invoice)}
              {figures.purchase != null && (
                <span className={cn("ml-1", figures.invoice - figures.purchase < 0 ? "text-destructive" : "text-success-ink")}>
                  (marge {formatCurrency(figures.invoice - figures.purchase)})
                </span>
              )}
            </p>
          )}
        </div>
        <div className="text-right tabular-nums whitespace-nowrap">
          <div className={cn(isReplaced && "line-through text-muted-foreground")}>{formatCurrency(Number(line.amount_incl_vat))}</div>
          <div className="text-[11px] text-muted-foreground">
            {line.quantity_label && line.quantity_label !== "1" ? `${line.quantity_label} × ` : ""}
            {Number(line.vat_rate)}% btw
          </div>
        </div>
        <div className="-mr-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isBusy} aria-label="Acties">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isReplaceableQuoteLine(line) && !isReplaced && (
                <DropdownMenuItem
                  onClick={() => {
                    setReplaceFor(line);
                    setReplaceChecked({});
                  }}
                >
                  Vervang door inkoopregel…
                </DropdownMenuItem>
              )}
              {isReplaceableQuoteLine(line) && isReplaced && (
                <DropdownMenuItem
                  onClick={() => {
                    setReplaceFor(line);
                    setReplaceChecked({});
                  }}
                >
                  Nog een inkoopregel erbij…
                </DropdownMenuItem>
              )}
              {isPurchase && <DropdownMenuItem onClick={() => handleRevert(line)}>Terugdraaien</DropdownMenuItem>}
              {(isPurchase || line.origin === "manual") && (
                <DropdownMenuItem
                  onClick={() => {
                    setRenameFor(line);
                    setRenameText(line.description);
                  }}
                >
                  Omschrijving aanpassen
                </DropdownMenuItem>
              )}
              {line.line_status === "active" && !isPurchase && line.origin !== "manual" && (
                <DropdownMenuItem
                  onClick={() => {
                    setHideFor(line);
                    setHideReason("");
                  }}
                >
                  Niet op de factuur
                </DropdownMenuItem>
              )}
              {isHidden && <DropdownMenuItem onClick={() => handleUnhide(line)}>Terug op de factuur</DropdownMenuItem>}
              {line.origin === "manual" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => handleManualRemove(line)}>
                    Verwijderen
                  </DropdownMenuItem>
                </>
              )}
              {isEmptyCostPost(line) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => handleRemoveCostPost(line)}>
                    Kostenpost verwijderen
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  const renderDestinationSelect = (line: WorksheetPurchaseLine) => {
    const draft = drafts[line.id];
    const proposal = proposals.get(line.id);
    const proposedLineId = proposal?.destination.kind === "replace" ? proposal.destination.lineId : null;
    const invoice = invoiceById.get(line.invoice_id);
    // Logies-offertes van dit programma, die van dezelfde partner eerst.
    const quotesForPartner = [...(lodgingQuotes ?? [])].sort((a, b) =>
      (a.partner_id === invoice?.partner_id ? 0 : 1) - (b.partner_id === invoice?.partner_id ? 0 : 1),
    );
    return (
      <div className="space-y-1">
        <Select
          value={draftValue(draft)}
          onValueChange={(v) => {
            const next = draftFromValue(v, proposal?.destination.kind === "keep" ? proposal.destination.reason : null);
            if (!next) return;
            setDrafts((prev) => ({ ...prev, [line.id]: next }));
            setChecked((prev) => ({ ...prev, [line.id]: true }));
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Kies bestemming…" />
          </SelectTrigger>
          <SelectContent>
            {replaceable.length > 0 && (
              <SelectGroup>
                <SelectLabel>Vervangt een offerteregel</SelectLabel>
                {[...replaceable]
                  .sort((a, b) => (a.id === proposedLineId ? -1 : b.id === proposedLineId ? 1 : 0))
                  .map((q) => (
                    <SelectItem key={q.id} value={`replace:${q.id}`}>
                      {q.description} · {formatCurrency(Number(q.quote_amount_incl_vat ?? q.amount_incl_vat))}
                      {q.line_status === "replaced" ? " (al vervangen)" : ""}
                    </SelectItem>
                  ))}
              </SelectGroup>
            )}
            <SelectGroup>
              <SelectLabel>Anders</SelectLabel>
              <SelectItem value="add">Als eigen regel op de factuur</SelectItem>
              <SelectItem value="keep">Laat staan (niet op de factuur)</SelectItem>
            </SelectGroup>
            {quotesForPartner.length > 0 && (
              <SelectGroup>
                <SelectLabel>Logies-offerte</SelectLabel>
                {quotesForPartner.map((q) => (
                  <SelectItem key={`room-${q.id}`} value={`lodging:room:${q.id}`}>
                    Kamer: {q.accommodation_name}
                  </SelectItem>
                ))}
                {quotesForPartner.map((q) => (
                  <SelectItem key={`extra-${q.id}`} value={`lodging:extra:${q.id}`}>
                    Extra bij: {q.accommodation_name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
        {draft?.kind === "keep" && (
          <Input
            className="h-8 text-xs"
            placeholder="Reden (bv. toeristenbelasting rekenen we zelf)"
            value={keepReasons[line.id] ?? draft.reason ?? ""}
            onChange={(e) => setKeepReasons((prev) => ({ ...prev, [line.id]: e.target.value }))}
          />
        )}
        {proposal?.reason && (
          <p className="text-xs text-muted-foreground flex items-start gap-1">
            <Sparkles className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
            <span>{proposal.reason}</span>
          </p>
        )}
      </div>
    );
  };

  const groupByInvoice = (list: WorksheetPurchaseLine[]) => {
    const groups = new Map<string, WorksheetPurchaseLine[]>();
    for (const l of list) {
      const arr = groups.get(l.invoice_id) ?? [];
      arr.push(l);
      groups.set(l.invoice_id, arr);
    }
    return [...groups.entries()]
      .map(([invoiceId, groupLines]) => ({ invoice: invoiceById.get(invoiceId), groupLines }))
      .filter((g): g is { invoice: PurchaseInvoiceWithRelations; groupLines: WorksheetPurchaseLine[] } => !!g.invoice);
  };

  const renderInvoiceHeader = (invoice: PurchaseInvoiceWithRelations, groupLines: WorksheetPurchaseLine[]) => {
    const isCollective = !!invoice.is_collective || invoice.request_id !== requestId;
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-muted-foreground">
        <span className="flex flex-wrap items-center gap-x-2">
          <span>
            <span className="font-medium text-foreground">{invoice.partner?.name ?? invoice.partner_id}</span>
            {" · "}factuur {invoice.invoice_number}
            {" · "}{format(new Date(invoice.invoice_date), "d MMM yyyy", { locale: nl })}
          </span>
          {isCollective && <Pill tone="info">Verzamelfactuur</Pill>}
          {invoice.billed_to === "customer" && <Pill tone="neutral">Gast betaalde rechtstreeks</Pill>}
        </span>
        <span className="tabular-nums">
          {isCollective
            ? `${formatCurrency(groupLines.reduce((s, l) => s + l.amount_incl_vat, 0))} van ${formatCurrency(Number(invoice.amount_incl_vat ?? 0))} voor dit project`
            : `${formatCurrency(Number(invoice.amount_incl_vat ?? 0))} incl.`}
        </span>
      </div>
    );
  };

  const candidateLinesForReplace = replaceCandidates(purchaseLines, lines, worksheetInvoices);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Proforma
              {proforma && isRegistered && (
                <Pill tone="info">Geregistreerd{registeredInvoice ? ` als ${registeredInvoice.invoice_number}` : ""}</Pill>
              )}
              {proforma && !isRegistered && state.open.length === 0 && <Pill tone="success">Alle inkoopregels verwerkt</Pill>}
              {proforma && !isRegistered && state.open.length > 0 && (
                <Pill tone="warning">
                  {state.open.length} {state.open.length === 1 ? "inkoopregel" : "inkoopregels"} nog niet op de factuur
                </Pill>
              )}
            </CardTitle>
            <CardDescription>
              De klantfactuur in wording. Elke regel weet waar hij vandaan komt; een inkoopregel vervangt een offerteregel of komt er
              als eigen regel bij.
              {proforma && <> Offerte bevroren op {format(new Date(proforma.accepted_at), "d MMM yyyy", { locale: nl })}.</>}
            </CardDescription>
          </div>
          {proforma && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(
                    registeredInvoice
                      ? `/admin/projecten/${requestId}/factuur?invoiceId=${registeredInvoice.id}`
                      : `/admin/projecten/${requestId}/factuur`,
                  )
                }
              >
                {isRegistered ? "Bekijk factuur" : "Bekijk voorbeeld"}
              </Button>
              {!isRegistered && (
                <Button size="sm" variant={state.open.length === 0 ? "default" : "outline"} onClick={onRegisterInvoice} disabled={isBusy}>
                  {invoiced > 0.005 && outstanding > 0.005 ? "Restant factureren" : "Factuur registreren"}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading || invoicesLoading || purchaseLoading ? (
          <LoadingState label="Proforma laden…" />
        ) : !proforma ? (
          isAccepted ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Dit project is akkoord, maar heeft nog geen proforma.</p>
              <Button size="sm" onClick={onCreate} disabled={!canCreate || busy}>
                {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Proforma aanmaken
              </Button>
            </div>
          ) : (
            <Notice tone="info">Nog geen akkoord van de klant. De proforma ontstaat zodra de offerte akkoord is.</Notice>
          )
        ) : (
          <>
            {isRegistered && (
              <Notice tone="info" title="Geregistreerd en bevroren">
                Deze proforma is als eindfactuur geregistreerd
                {registeredInvoice ? ` (${registeredInvoice.invoice_number})` : ""}. De regels zijn bevroren; een latere
                inkoopfactuur gaat via een creditnota of een aanvullende factuur.
              </Notice>
            )}
            {/* De factuur */}
            <div className="rounded-md border">
              {sections.length === 0 ? (
                <EmptyState title="Nog geen regels" description="De proforma is leeg; voeg een handmatige regel toe of wacht op de offerte." />
              ) : (
                sections.map((section) => (
                  <div key={section.label}>
                    <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/50 border-b">
                      {section.label}
                    </div>
                    {section.lines.map(renderLine)}
                  </div>
                ))
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-t bg-muted/30">
                <div className="flex items-center gap-3 text-xs">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setManualOpen(true)} disabled={isBusy}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Handmatige regel
                  </Button>
                  {lines.some((l) => l.line_status === "hidden") && (
                    <button type="button" className="text-muted-foreground underline-offset-2 hover:underline" onClick={() => setShowHidden((v) => !v)}>
                      {showHidden ? "Verborgen regels verbergen" : "Verborgen regels tonen"}
                    </button>
                  )}
                </div>
                <div className="text-right text-sm tabular-nums space-y-0.5">
                  <div className="text-xs text-muted-foreground">
                    Excl. {formatCurrency(totals.exclVat)}
                    {totals.vatGroups.map((g) => (
                      <span key={g.rate}> · btw {g.rate}% {formatCurrency(g.vatAmount)}</span>
                    ))}
                  </div>
                  <div className="font-semibold">Totaal incl. btw {formatCurrency(totals.inclVat)}</div>
                  {invoiced > 0.005 && (
                    <div className="text-xs text-muted-foreground">
                      Geregistreerd {formatCurrency(invoiced)} · openstaand {formatCurrency(outstanding)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Nog niet op de factuur */}
            {invoicesWithoutLines.length > 0 && (
              <Notice tone="info" title="Facturen zonder orderregels">
                <ul className="mt-1 space-y-1">
                  {invoicesWithoutLines.map((inv) => (
                    <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {inv.partner?.name ?? inv.partner_id} · {inv.invoice_number} · {formatCurrency(Number(inv.amount_incl_vat ?? 0))}
                      </span>
                      <Button variant="outline" size="sm" className="h-7 text-xs" disabled={createLines.isPending} onClick={() => createLines.mutate(inv)}>
                        Orderregels aanmaken
                      </Button>
                    </li>
                  ))}
                </ul>
              </Notice>
            )}

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">
                  Nog niet op de factuur
                  <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
                    {state.open.length} {state.open.length === 1 ? "regel" : "regels"} · {formatCurrency(openTotal)}
                  </span>
                </h4>
                {state.open.length > 0 && (
                  <Button size="sm" onClick={handleConfirm} disabled={isBusy || toConfirm.length === 0}>
                    {isBusy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                    Bevestig ({toConfirm.length})
                  </Button>
                )}
              </div>
              {state.open.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {purchaseLines.length === 0
                    ? "Nog geen inkoopfacturen met orderregels op dit project."
                    : "Alle inkoopregels zijn verwerkt."}
                </p>
              ) : (
                groupByInvoice(state.open).map(({ invoice, groupLines }) => (
                  <div key={invoice.id} className="space-y-1.5">
                    {renderInvoiceHeader(invoice, groupLines)}
                    {groupLines.map((line) => (
                      <div
                        key={line.id}
                        className={cn(
                          "grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 items-start rounded-md border px-2 py-2 text-sm",
                          checked[line.id] ? "border-primary/30 bg-accent-soft/40" : "border-border bg-card",
                        )}
                      >
                        <div className="pt-0.5">
                          <Checkbox
                            checked={!!checked[line.id]}
                            onCheckedChange={(v) => setChecked((prev) => ({ ...prev, [line.id]: v === true }))}
                            aria-label="Meenemen bij bevestigen"
                          />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-medium truncate">{line.description || "Regel"}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {line.quantity !== 1 ? `${line.quantity} × ` : ""}
                              {formatCurrency(line.amount_incl_vat)} incl. ({line.vat_rate}%)
                            </span>
                          </div>
                          {renderDestinationSelect(line)}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {bureauInvoices.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Gefactureerd</h4>
                {bureauInvoices.map((invoice) => {
                  const isForwarded = invoice.status === "forwarded" || !!invoice.forwarded_to_accounting_at;
                  const customerSentAt = customerSendMap[invoice.id] ?? customerSendMap[`number:${invoice.invoice_number}`];
                  return (
                    <div key={invoice.id} className="flex flex-wrap items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="font-medium underline decoration-dotted underline-offset-2 hover:text-primary"
                            onClick={() => navigate(`/admin/projecten/${requestId}/factuur?invoiceId=${invoice.id}`)}
                          >
                            {invoice.invoice_number}
                          </button>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(invoice.invoice_date), "d MMM yyyy", { locale: nl })}
                          </span>
                          <Pill tone="neutral" size="sm">{invoiceTypeLabels[invoice.invoice_type] ?? invoice.invoice_type}</Pill>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Pill tone={customerSentAt ? "success" : "neutral"} size="sm">
                            {customerSentAt ? `Naar klant ${format(new Date(customerSentAt), "d MMM", { locale: nl })}` : "Niet naar klant verstuurd"}
                          </Pill>
                          <Pill tone={isForwarded ? "info" : "neutral"} size="sm">
                            {isForwarded
                              ? `Snelstart${invoice.forwarded_to_accounting_at ? ` ${format(new Date(invoice.forwarded_to_accounting_at), "d MMM", { locale: nl })}` : ""}`
                              : "Nog niet doorgestuurd"}
                          </Pill>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn("tabular-nums font-medium", invoice.invoice_type === "credit" && "text-destructive")}>
                          {invoice.invoice_type === "credit" ? "-" : ""}
                          {formatCurrency(Number(invoice.amount_incl_vat))}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => navigate(`/admin/projecten/${requestId}/factuur?action=send&invoiceId=${invoice.id}`)}
                          >
                            {customerSentAt ? "Opnieuw naar klant" : "Naar klant"}
                          </Button>
                          {onForwardInvoice && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => onForwardInvoice(invoice)}>
                              {isForwarded ? "Opnieuw Snelstart" : "Snelstart"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {state.kept.length > 0 && (
              <div className="space-y-2">
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm font-semibold"
                  onClick={() => setShowKept((v) => !v)}
                >
                  {showKept ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Gelaten, niet op de factuur
                  <span className="ml-1 text-xs font-normal text-muted-foreground">({state.kept.length})</span>
                </button>
                {showKept &&
                  groupByInvoice(state.kept).map(({ invoice, groupLines }) => (
                    <div key={invoice.id} className="space-y-1.5">
                      {renderInvoiceHeader(invoice, groupLines)}
                      {groupLines.map((line) => (
                        <div key={line.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm">
                          <span className="min-w-0">
                            <span className="font-medium">{line.description}</span>
                            <span className="ml-2 text-xs text-muted-foreground tabular-nums">{formatCurrency(line.amount_incl_vat)}</span>
                            {line.skip_reason && <span className="ml-2 text-xs text-muted-foreground">· {line.skip_reason}</span>}
                            {invoice.billed_to === "customer" && <span className="ml-2 text-xs text-muted-foreground">· door de gast betaald</span>}
                          </span>
                          {invoice.billed_to !== "customer" && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={isBusy} onClick={() => handleReopen(line)}>
                              Weer open
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Vervang door inkoopregel… */}
      <Dialog open={!!replaceFor} onOpenChange={(open) => !open && setReplaceFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{replaceFor?.line_status === "replaced" ? "Nog een inkoopregel erbij" : "Vervang door inkoopregel"}</DialogTitle>
            <DialogDescription>
              {replaceFor && (
                <>
                  “{replaceFor.description}” ({formatCurrency(Number(replaceFor.quote_amount_incl_vat ?? replaceFor.amount_incl_vat))} offerte).
                  Kies de inkoopregels die ervoor in de plaats komen.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto space-y-3">
            {candidateLinesForReplace.length === 0 ? (
              <p className="text-sm text-muted-foreground">Er zijn geen inkoopregels meer die nog niet op de factuur staan.</p>
            ) : (
              groupByInvoice(candidateLinesForReplace).map(({ invoice, groupLines }) => (
                <div key={invoice.id} className="space-y-1">
                  {renderInvoiceHeader(invoice, groupLines)}
                  {groupLines.map((line) => (
                    <label key={line.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm cursor-pointer">
                      <Checkbox
                        checked={!!replaceChecked[line.id]}
                        onCheckedChange={(v) => setReplaceChecked((prev) => ({ ...prev, [line.id]: v === true }))}
                      />
                      <span className="flex-1 min-w-0 truncate">{line.description}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{formatCurrency(line.amount_incl_vat)}</span>
                      {candidateStatusLabel(line) && <Pill tone="neutral" size="sm">{candidateStatusLabel(line)}</Pill>}
                    </label>
                  ))}
                </div>
              ))
            )}
          </div>
          {replaceFor && (
            <p className="text-xs text-muted-foreground tabular-nums">
              Na bevestigen op de factuur:{" "}
              {formatCurrency(
                candidateLinesForReplace.filter((l) => replaceChecked[l.id]).reduce((s, l) => s + l.amount_incl_vat, 0) +
                  (replaceFor.line_status === "replaced" ? itemFigures(replaceFor, lines, purchaseLines).invoice : 0),
              )}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplaceFor(null)}>
              Annuleren
            </Button>
            <Button onClick={handleReplaceConfirm} disabled={isBusy || !Object.values(replaceChecked).some(Boolean)}>
              {isBusy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Vervangen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Niet op de factuur */}
      <Dialog open={!!hideFor} onOpenChange={(open) => !open && setHideFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Niet op de factuur</DialogTitle>
            <DialogDescription>
              “{hideFor?.description}” telt dan niet mee. De regel blijft zichtbaar op de proforma en is altijd terug te zetten.
            </DialogDescription>
          </DialogHeader>
          <Input placeholder="Reden (optioneel)" value={hideReason} onChange={(e) => setHideReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setHideFor(null)}>
              Annuleren
            </Button>
            <Button onClick={handleHideConfirm} disabled={isBusy}>
              Niet op de factuur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Omschrijving aanpassen */}
      <Dialog open={!!renameFor} onOpenChange={(open) => !open && setRenameFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Omschrijving aanpassen</DialogTitle>
          </DialogHeader>
          <Input value={renameText} onChange={(e) => setRenameText(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFor(null)}>
              Annuleren
            </Button>
            <Button onClick={handleRenameConfirm} disabled={isBusy || !renameText.trim()}>
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Handmatige regel */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Handmatige regel</DialogTitle>
            <DialogDescription>Voor de uitzondering die niet uit de offerte of een inkoopfactuur komt.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input
              placeholder="Omschrijving"
              value={manualInput.description}
              onChange={(e) => setManualInput((p) => ({ ...p, description: e.target.value }))}
            />
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs text-muted-foreground">
                Aantal
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={manualInput.quantity}
                  onChange={(e) => setManualInput((p) => ({ ...p, quantity: Number(e.target.value) || 0 }))}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Prijs excl. btw
                <Input
                  type="number"
                  step="0.01"
                  value={manualInput.unit_price_excl_vat}
                  onChange={(e) => setManualInput((p) => ({ ...p, unit_price_excl_vat: Number(e.target.value) || 0 }))}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Btw %
                <Select value={String(manualInput.vat_rate)} onValueChange={(v) => setManualInput((p) => ({ ...p, vat_rate: Number(v) }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="21">21%</SelectItem>
                    <SelectItem value="9">9%</SelectItem>
                    <SelectItem value="0">0%</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleManualAdd} disabled={isBusy || !manualInput.description.trim()}>
              Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
