import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, LoadingState, Notice, Pill } from "@/components/system";
import { ArrowRightLeft, ChevronDown, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { usePurchaseInvoicesByRequest } from "@/hooks/usePurchaseInvoices";
import {
  useApplyLodgingLines,
  useApplyPurchaseLineCharges,
  useCreateLinesFromInvoice,
  useLodgingQuotesForProject,
  useMoveLinesToProject,
  usePurchaseInvoiceLinesByRequest,
  type ChargeDecision,
  type LodgingLineDecision,
  type PurchaseInvoiceLineRow,
} from "@/hooks/usePurchaseInvoiceLines";
import {
  lodgingExtraCategory,
  matchPurchaseLines,
  type LineMatch,
  type MatchableInvoice,
  type MatchableItem,
} from "@/lib/purchaseLineMatcher";
import { ProjectPickerPopover } from "@/components/admin/purchase-invoices/ProjectPickerPopover";
import { projectLabel, usePickableProjects } from "@/hooks/usePickableProjects";
import type { ProgramItemBillingLine } from "@/types/programItemBillingLine";
import type { PurchaseInvoiceWithRelations } from "@/types/purchaseInvoice";

/**
 * Werkblad Doorbelasten (docs/plan-inkoopfacturen-doorbelasten.md, §3.3 en §3.5).
 *
 * Links de inkoopregels die bij dit project horen (ook die van
 * verzamelfacturen), elk met een voorgestelde bestemming; rechts het programma
 * met offerte, werkelijk en verschil. Eén bevestiging schrijft klantregels én
 * commissieverdeling via `apply_purchase_line_charges`; regels naar een
 * logies-offerte gaan via `apply-purchase-invoice-to-lodging`, regels naar een
 * ander project via de verdeling.
 */

export interface WorksheetItem {
  id: string;
  block_name: string;
  provider_id: string;
  provider_name?: string | null;
  day_index: number;
  status: string;
  quoted_price: number | null;
  admin_price_override?: number | null;
  keep_quoted_price?: boolean | null;
  override_people?: number | null;
}

interface ChargeWorksheetCardProps {
  requestId: string;
  items: WorksheetItem[];
  numberOfPeople: number;
  selectedDates: string[];
  linesByItem: Record<string, ProgramItemBillingLine[]>;
  onChanged: () => void;
}

type Draft =
  | { kind: "item"; itemId: string }
  | { kind: "new_cost"; costKey: string; costName: string }
  | { kind: "skip"; reason: string }
  | { kind: "lodging"; quoteId: string; target: "room" | "extra" }
  | { kind: "move"; requestId: string | null };

const SKIP_REASONS: Array<{ value: string; label: string }> = [
  { value: "toeristenbelasting", label: "Toeristenbelasting (bureau rekent zelf)" },
  { value: "inbegrepen", label: "Zit al in de offerteprijs" },
  { value: "bureaukosten", label: "Kosten voor het bureau" },
  { value: "anders", label: "Anders" },
];

const STATUS_LABEL: Record<string, { label: string; tone: "neutral" | "success" | "info" | "warning" }> = {
  open: { label: "Te verwerken", tone: "warning" },
  charged: { label: "Doorbelast", tone: "success" },
  kept_quote: { label: "Offerteprijs blijft", tone: "info" },
  skipped: { label: "Niet doorbelast", tone: "neutral" },
  legacy: { label: "Verdeeld vóór het werkblad", tone: "neutral" },
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

const sumIncl = (lines: ProgramItemBillingLine[] | undefined) =>
  (lines ?? []).reduce((s, l) => s + Number(l.amount_incl_vat || 0), 0);

const isActive = (item: WorksheetItem) => item.status !== "cancelled";
const isCostItem = (item: WorksheetItem) => item.day_index === -1;

const draftToDecision = (lineId: string, draft: Draft): ChargeDecision | null => {
  switch (draft.kind) {
    case "item":
      return { line_id: lineId, action: "item", item_id: draft.itemId };
    case "new_cost":
      return { line_id: lineId, action: "new_cost", cost_key: draft.costKey, cost_name: draft.costName };
    case "skip":
      return { line_id: lineId, action: "skip", skip_reason: draft.reason };
    default:
      return null;
  }
};

const draftFromMatch = (match: LineMatch): Draft => {
  const p = match.proposal;
  if (p.kind === "item") return { kind: "item", itemId: p.itemId };
  if (p.kind === "skip") return { kind: "skip", reason: "toeristenbelasting" };
  return { kind: "new_cost", costKey: p.costKey, costName: p.costName };
};

const reasonText = (match: LineMatch | undefined): string | null => {
  if (!match) return null;
  const p = match.proposal;
  if (p.kind === "item") return p.reasons.join(", ");
  if (p.kind === "skip") return p.label;
  return p.reason;
};

export const ChargeWorksheetCard = ({
  requestId,
  items,
  numberOfPeople,
  selectedDates,
  linesByItem,
  onChanged,
}: ChargeWorksheetCardProps) => {
  const { invoices, isLoading: invoicesLoading } = usePurchaseInvoicesByRequest(requestId);
  const { data: lines, isLoading: linesLoading } = usePurchaseInvoiceLinesByRequest(requestId);
  const { data: lodgingQuotes } = useLodgingQuotesForProject(requestId);
  const { data: projects } = usePickableProjects();
  const apply = useApplyPurchaseLineCharges(requestId);
  const applyLodging = useApplyLodgingLines();
  const moveLines = useMoveLinesToProject();
  const createLines = useCreateLinesFromInvoice();

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [showProcessed, setShowProcessed] = useState(false);
  const [costNames, setCostNames] = useState<Record<string, string>>({});
  const [togglingItem, setTogglingItem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const activeItems = useMemo(() => items.filter(isActive), [items]);
  const programItems = useMemo(
    () => activeItems.filter((it) => !isCostItem(it)).sort((a, b) => a.day_index - b.day_index),
    [activeItems],
  );
  const costItems = useMemo(() => activeItems.filter(isCostItem), [activeItems]);
  const itemById = useMemo(() => new Map(activeItems.map((it) => [it.id, it])), [activeItems]);
  const invoiceById = useMemo(
    () => new Map((invoices ?? []).map((inv) => [inv.id, inv])),
    [invoices],
  );
  const quoteById = useMemo(() => new Map((lodgingQuotes ?? []).map((q) => [q.id, q])), [lodgingQuotes]);

  const matches = useMemo(() => {
    if (!lines || !invoices) return new Map<string, LineMatch>();
    const matchableInvoices: MatchableInvoice[] = invoices.map((inv) => ({
      id: inv.id,
      partnerId: inv.partner_id ?? null,
      partnerName: inv.partner?.name ?? null,
      invoiceNumber: inv.invoice_number ?? null,
      amountInclVat: Number(inv.amount_incl_vat ?? 0),
      allocatedItemIds: (inv.allocations ?? []).map((a) => a.item_id),
    }));
    const matchableItems: MatchableItem[] = activeItems.map((it) => ({
      id: it.id,
      name: it.block_name,
      providerId: it.provider_id ?? null,
      dayIndex: it.day_index,
      status: it.status,
      quotedInclVat: it.quoted_price != null ? Number(it.quoted_price) : null,
      people: it.override_people ?? numberOfPeople ?? null,
      date: it.day_index >= 0 ? selectedDates[it.day_index] ?? null : null,
    }));
    const result = matchPurchaseLines({
      lines: lines.map((l) => ({
        id: l.id,
        invoiceId: l.invoice_id,
        description: l.description,
        quantity: Number(l.quantity) || 1,
        amountExclVat: Number(l.amount_excl_vat),
        amountInclVat: Number(l.amount_incl_vat),
        vatRate: Number(l.vat_rate),
      })),
      invoices: matchableInvoices,
      items: matchableItems,
    });
    return new Map(result.map((m) => [m.lineId, m]));
  }, [lines, invoices, activeItems, numberOfPeople, selectedDates]);

  const openLines = useMemo(() => (lines ?? []).filter((l) => l.charge_status === "open"), [lines]);
  const processedLines = useMemo(() => (lines ?? []).filter((l) => l.charge_status !== "open"), [lines]);

  // Voorstellen worden het concept zodra de regels binnen zijn. Een regel die
  // al een onderdeel meekreeg (verzamelfactuur: boekingsreferentie), een zeker
  // voorstel, een kostenpost en toeristenbelasting staan aangevinkt; een
  // waarschijnlijk onderdeel niet.
  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const line of openLines) {
        if (next[line.id]) continue;
        if (line.item_id && itemById.has(line.item_id)) {
          next[line.id] = { kind: "item", itemId: line.item_id };
          continue;
        }
        const match = matches.get(line.id);
        if (match) next[line.id] = draftFromMatch(match);
      }
      return next;
    });
    setChecked((prev) => {
      const next = { ...prev };
      for (const line of openLines) {
        if (line.id in next) continue;
        if (line.item_id && itemById.has(line.item_id)) {
          next[line.id] = true;
          continue;
        }
        const match = matches.get(line.id);
        if (!match) continue;
        const p = match.proposal;
        next[line.id] = p.kind !== "item" || p.confidence === "sure";
      }
      return next;
    });
  }, [openLines, matches, itemById]);

  const invoicesWithoutLines = useMemo(
    () =>
      (invoices ?? []).filter(
        (inv) => inv.request_id === requestId && !(lines ?? []).some((l) => l.invoice_id === inv.id),
      ),
    [invoices, lines, requestId],
  );

  const toConfirm = useMemo(() => {
    const db: ChargeDecision[] = [];
    const lodging: LodgingLineDecision[] = [];
    const moves: Array<{ line: PurchaseInvoiceLineRow; requestId: string | null }> = [];
    for (const line of lines ?? []) {
      const draft = drafts[line.id];
      if (!draft) continue;
      const include = line.charge_status === "open" ? checked[line.id] : editing[line.id];
      if (!include) continue;
      if (draft.kind === "lodging") {
        lodging.push({ line, quoteId: draft.quoteId, target: draft.target, category: lodgingExtraCategory(line.description) });
        continue;
      }
      if (draft.kind === "move") {
        if (draft.requestId && draft.requestId !== requestId) moves.push({ line, requestId: draft.requestId });
        continue;
      }
      const resolved: Draft =
        draft.kind === "new_cost"
          ? { ...draft, costName: costNames[draft.costKey] ?? draft.costName }
          : draft;
      const decision = draftToDecision(line.id, resolved);
      if (decision) db.push(decision);
    }
    return { db, lodging, moves, total: db.length + lodging.length + moves.length };
  }, [lines, drafts, checked, editing, costNames, requestId]);

  const openTotalIncl = openLines.reduce((s, l) => s + Number(l.amount_incl_vat), 0);

  const handleConfirm = async () => {
    if (toConfirm.total === 0) return;
    setConfirming(true);
    try {
      const parts: string[] = [];
      // Eerst verplaatsen (die regels verdwijnen uit dit werkblad), dan logies,
      // dan de rest in één databasetransactie.
      if (toConfirm.moves.length > 0) {
        const byInvoice = new Map<string, Array<{ lineId: string; requestId: string | null }>>();
        for (const m of toConfirm.moves) {
          const arr = byInvoice.get(m.line.invoice_id) ?? [];
          arr.push({ lineId: m.line.id, requestId: m.requestId });
          byInvoice.set(m.line.invoice_id, arr);
        }
        for (const [invoiceId, moves] of byInvoice) {
          await moveLines.mutateAsync({ invoiceId, moves });
        }
        parts.push(`${toConfirm.moves.length} naar een ander project`);
      }
      if (toConfirm.lodging.length > 0) {
        const invoicesMeta: Record<string, { partner_id: string | null; invoice_number: string | null }> = {};
        for (const d of toConfirm.lodging) {
          const inv = invoiceById.get(d.line.invoice_id);
          invoicesMeta[d.line.invoice_id] = { partner_id: inv?.partner_id ?? null, invoice_number: inv?.invoice_number ?? null };
        }
        await applyLodging.mutateAsync({ decisions: toConfirm.lodging, invoices: invoicesMeta });
        parts.push(`${toConfirm.lodging.length} op logies`);
      }
      if (toConfirm.db.length > 0) {
        const result = await apply.mutateAsync(toConfirm.db);
        if (result.charged > 0) parts.push(`${result.charged} doorbelast`);
        if (result.kept > 0) parts.push(`${result.kept} op offerteprijs`);
        if (result.skipped > 0) parts.push(`${result.skipped} niet doorbelast`);
        if (result.new_costs > 0) parts.push(`${result.new_costs} ${result.new_costs === 1 ? "nieuwe kostenpost" : "nieuwe kostenposten"}`);
      }
      toast.success(`Verwerkt: ${parts.join(", ") || "niets gewijzigd"}`);
      setEditing({});
      setChecked({});
      setDrafts({});
      onChanged();
    } catch {
      // De hooks melden de fout zelf.
    } finally {
      setConfirming(false);
    }
  };

  // "Offerteprijs houden" per onderdeel: de vlag omzetten en de al gekoppelde
  // regels van dat onderdeel opnieuw verwerken, zodat klantregels verschijnen
  // of verdwijnen zonder dat je ze stuk voor stuk hoeft aan te raken.
  const toggleKeepQuote = async (item: WorksheetItem, next: boolean) => {
    setTogglingItem(item.id);
    try {
      const { error } = await supabase
        .from("program_request_items")
        .update({ keep_quoted_price: next })
        .eq("id", item.id);
      if (error) throw error;
      const linked = (lines ?? []).filter(
        (l) => l.item_id === item.id && (l.charge_status === "charged" || l.charge_status === "kept_quote"),
      );
      if (linked.length > 0) {
        await apply.mutateAsync(linked.map((l) => ({ line_id: l.id, action: "item" as const, item_id: item.id })));
      }
      toast.success(next ? "Offerteprijs blijft leidend voor dit onderdeel" : "Werkelijke kosten worden doorbelast");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kon de instelling niet opslaan");
    } finally {
      setTogglingItem(null);
    }
  };

  const setDraft = (lineId: string, draft: Draft) => {
    setDrafts((prev) => ({ ...prev, [lineId]: draft }));
    setChecked((prev) => ({ ...prev, [lineId]: true }));
  };

  const selectValueFor = (draft: Draft | undefined): string => {
    if (!draft) return "";
    if (draft.kind === "item") return `item:${draft.itemId}`;
    if (draft.kind === "skip") return "skip";
    if (draft.kind === "lodging") return `lodging:${draft.target}:${draft.quoteId}`;
    if (draft.kind === "move") return "move";
    return `new:${draft.costKey}`;
  };

  const handleSelect = (line: PurchaseInvoiceLineRow, value: string) => {
    const invoice = invoiceById.get(line.invoice_id);
    const partnerKey = invoice?.partner_id ?? line.invoice_id;
    const partnerName = invoice?.partner?.name ?? "Overige kosten";
    const current = drafts[line.id];
    if (value === "skip") {
      setDraft(line.id, { kind: "skip", reason: current?.kind === "skip" ? current.reason : "anders" });
    } else if (value === "move") {
      setDraft(line.id, { kind: "move", requestId: current?.kind === "move" ? current.requestId : null });
    } else if (value === "new:own") {
      setDraft(line.id, { kind: "new_cost", costKey: `line:${line.id}`, costName: line.description });
    } else if (value.startsWith("new:")) {
      setDraft(line.id, { kind: "new_cost", costKey: partnerKey, costName: partnerName });
    } else if (value.startsWith("item:")) {
      setDraft(line.id, { kind: "item", itemId: value.slice(5) });
    } else if (value.startsWith("lodging:")) {
      const [, target, quoteId] = value.split(":");
      setDraft(line.id, { kind: "lodging", quoteId, target: target === "extra" ? "extra" : "room" });
    }
  };

  const renderDestinationSelect = (line: PurchaseInvoiceLineRow) => {
    const draft = drafts[line.id];
    const invoice = invoiceById.get(line.invoice_id);
    const partnerKey = invoice?.partner_id ?? line.invoice_id;
    const partnerName = invoice?.partner?.name ?? "Overige kosten";
    const partnerItems = programItems.filter((it) => it.provider_id === invoice?.partner_id);
    const otherItems = programItems.filter((it) => it.provider_id !== invoice?.partner_id);
    const partnerQuotes = (lodgingQuotes ?? []).filter((q) => !invoice?.partner_id || q.partner_id === invoice.partner_id);
    const otherQuotes = (lodgingQuotes ?? []).filter((q) => !partnerQuotes.includes(q));
    const quoteOptions = [...partnerQuotes, ...otherQuotes];
    return (
      <div className="space-y-1.5">
        <Select value={selectValueFor(draft)} onValueChange={(v) => handleSelect(line, v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Kies bestemming…" />
          </SelectTrigger>
          <SelectContent>
            {partnerItems.length > 0 && (
              <SelectGroup>
                <SelectLabel>Onderdelen van {partnerName}</SelectLabel>
                {partnerItems.map((it) => (
                  <SelectItem key={it.id} value={`item:${it.id}`}>
                    Dag {it.day_index + 1}: {it.block_name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {otherItems.length > 0 && (
              <SelectGroup>
                <SelectLabel>Andere onderdelen</SelectLabel>
                {otherItems.map((it) => (
                  <SelectItem key={it.id} value={`item:${it.id}`}>
                    Dag {it.day_index + 1}: {it.block_name} ({it.provider_name || it.provider_id})
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {quoteOptions.length > 0 && (
              <SelectGroup>
                <SelectLabel>Logies-offerte</SelectLabel>
                {quoteOptions.map((q) => (
                  <SelectItem key={`room-${q.id}`} value={`lodging:room:${q.id}`}>
                    Kamer: {q.accommodation_name}
                  </SelectItem>
                ))}
                {quoteOptions.map((q) => (
                  <SelectItem key={`extra-${q.id}`} value={`lodging:extra:${q.id}`}>
                    Extra bij: {q.accommodation_name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            <SelectGroup>
              <SelectLabel>Overige kosten</SelectLabel>
              {costItems.map((it) => (
                <SelectItem key={it.id} value={`item:${it.id}`}>
                  Kostenpost: {it.block_name}
                </SelectItem>
              ))}
              <SelectItem value={`new:${partnerKey}`}>Nieuwe kostenpost: {costNames[partnerKey] ?? partnerName}</SelectItem>
              <SelectItem value="new:own">Nieuwe kostenpost met eigen naam…</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Niet op deze klantfactuur</SelectLabel>
              <SelectItem value="skip">Niet doorbelasten</SelectItem>
              <SelectItem value="move">Hoort bij een ander project…</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        {draft?.kind === "new_cost" && (
          <Input
            className="h-7 text-xs"
            value={costNames[draft.costKey] ?? draft.costName}
            onChange={(e) => setCostNames((prev) => ({ ...prev, [draft.costKey]: e.target.value }))}
            placeholder="Naam van de kostenpost"
          />
        )}
        {draft?.kind === "skip" && (
          <Select
            value={draft.reason}
            onValueChange={(reason) => setDraft(line.id, { kind: "skip", reason })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SKIP_REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {draft?.kind === "move" && (
          <ProjectPickerPopover
            value={draft.requestId}
            onChange={(id) => setDraft(line.id, { kind: "move", requestId: id })}
            projects={(projects ?? []).filter((p) => p.id !== requestId)}
            size="sm"
            placeholder="Kies het andere project…"
          />
        )}
        {draft?.kind === "lodging" && (
          <p className="text-xs text-muted-foreground">
            {draft.target === "room"
              ? "Vervangt de kamerprijs op de offerte (het origineel blijft bewaard)."
              : `Wordt een extra bij de offerte (${lodgingExtraCategory(line.description)}).`}
          </p>
        )}
      </div>
    );
  };

  const processedLabel = (line: PurchaseInvoiceLineRow): string => {
    if (line.lodging_quote_id) {
      const q = quoteById.get(line.lodging_quote_id);
      return `Logies${line.lodging_target === "extra" ? " (extra)" : " (kamer)"}: ${q?.accommodation_name ?? "offerte"}`;
    }
    if (line.charge_status === "skipped") {
      return `Niet doorbelast${line.skip_reason ? `: ${SKIP_REASONS.find((r) => r.value === line.skip_reason)?.label ?? line.skip_reason}` : ""}`;
    }
    const target = line.item_id ? itemById.get(line.item_id) : undefined;
    return target
      ? `${isCostItem(target) ? "Kostenpost" : `Dag ${target.day_index + 1}`}: ${target.block_name}`
      : "Zonder bestemming";
  };

  const renderLineRow = (line: PurchaseInvoiceLineRow, mode: "open" | "processed") => {
    const match = matches.get(line.id);
    const reason = line.item_id && mode === "open" && drafts[line.id]?.kind === "item"
      ? "al aan dit onderdeel gekoppeld bij het verdelen"
      : reasonText(match);
    const isEditing = mode === "open" || editing[line.id];
    const status = STATUS_LABEL[line.charge_status] ?? STATUS_LABEL.open;
    const onLodging = !!line.lodging_quote_id;
    return (
      <div
        key={line.id}
        className={cn(
          "grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-1 items-start rounded-md border px-2 py-2 text-sm",
          mode === "open" && checked[line.id] ? "border-primary/30 bg-accent-soft/40" : "border-border bg-card",
        )}
      >
        <div className="pt-0.5">
          {mode === "open" ? (
            <Checkbox
              checked={!!checked[line.id]}
              onCheckedChange={(v) => setChecked((prev) => ({ ...prev, [line.id]: v === true }))}
              aria-label="Meenemen bij bevestigen"
            />
          ) : (
            <Pill tone={status.tone}>{status.label}</Pill>
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium truncate">{line.description || "Regel"}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {Number(line.quantity) !== 1 ? `${Number(line.quantity)} × ` : ""}
              {formatCurrency(Number(line.amount_incl_vat))} incl. ({Number(line.vat_rate)}%)
            </span>
          </div>
          {isEditing ? (
            <>
              {renderDestinationSelect(line)}
              {reason && (
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Sparkles className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                  <span>{reason}</span>
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{processedLabel(line)}</p>
          )}
        </div>
        <div className="text-right">
          {mode === "processed" && !isEditing && !onLodging && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setEditing((prev) => ({ ...prev, [line.id]: true }));
                if (!drafts[line.id] && match) setDrafts((prev) => ({ ...prev, [line.id]: draftFromMatch(match) }));
              }}
            >
              Wijzig
            </Button>
          )}
          {mode === "processed" && !isEditing && onLodging && (
            <span className="text-[10px] text-muted-foreground">via offerte</span>
          )}
          {mode === "processed" && isEditing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setEditing((prev) => ({ ...prev, [line.id]: false }))}
            >
              Laat staan
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderInvoiceGroup = (invoice: PurchaseInvoiceWithRelations, groupLines: PurchaseInvoiceLineRow[], mode: "open" | "processed") => {
    const isCollective = !!invoice.is_collective || invoice.request_id !== requestId;
    return (
      <div key={`${invoice.id}-${mode}`} className="space-y-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-muted-foreground">
          <span className="flex flex-wrap items-center gap-x-2">
            <span>
              <span className="font-medium text-foreground">{invoice.partner?.name ?? invoice.partner_id}</span>
              {" · "}factuur {invoice.invoice_number}
              {" · "}{format(new Date(invoice.invoice_date), "d MMM yyyy", { locale: nl })}
            </span>
            {isCollective && <Pill tone="info">Verzamelfactuur</Pill>}
          </span>
          <span className="tabular-nums">
            {isCollective
              ? `${formatCurrency(groupLines.reduce((s, l) => s + Number(l.amount_incl_vat), 0))} van ${formatCurrency(Number(invoice.amount_incl_vat ?? 0))} voor dit project`
              : `${formatCurrency(Number(invoice.amount_incl_vat ?? 0))} incl.`}
          </span>
        </div>
        <div className="space-y-1.5">{groupLines.map((l) => renderLineRow(l, mode))}</div>
      </div>
    );
  };

  const groupByInvoice = (list: PurchaseInvoiceLineRow[]) => {
    const groups = new Map<string, PurchaseInvoiceLineRow[]>();
    for (const l of list) {
      const arr = groups.get(l.invoice_id) ?? [];
      arr.push(l);
      groups.set(l.invoice_id, arr);
    }
    return Array.from(groups.entries())
      .map(([invoiceId, groupLines]) => ({ invoice: invoiceById.get(invoiceId), groupLines }))
      .filter((g): g is { invoice: PurchaseInvoiceWithRelations; groupLines: PurchaseInvoiceLineRow[] } => !!g.invoice);
  };

  const loading = invoicesLoading || linesLoading;
  const hasInvoices = (invoices?.length ?? 0) > 0;
  const busy = confirming || apply.isPending || applyLodging.isPending || moveLines.isPending;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Doorbelasten aan de klant
            </CardTitle>
            <CardDescription className="text-xs">
              Inkoopregels naar programma-onderdelen, kostenposten, de logies-offerte of niet doorbelasten.
              Bevestigen zet de klantregels én de verdeling voor de commissie.
            </CardDescription>
          </div>
          {openLines.length > 0 && (
            <div className="text-right text-xs text-muted-foreground">
              Nog te verwerken:{" "}
              <span className="font-medium text-foreground">
                {openLines.length} {openLines.length === 1 ? "regel" : "regels"} · {formatCurrency(openTotalIncl)}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingState label="Inkoopregels laden…" />
        ) : !hasInvoices ? (
          <EmptyState
            title="Nog geen inkoopfacturen op dit project"
            description="Registreer een inkoopfactuur via de inbox of “Toevoegen” bij Inkoopfacturen; de regels verschijnen dan hier."
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            {/* Links: inkoopregels */}
            <div className="space-y-4 min-w-0">
              {invoicesWithoutLines.length > 0 && (
                <Notice tone="info" title="Facturen zonder orderregels">
                  <ul className="mt-1 space-y-1">
                    {invoicesWithoutLines.map((inv) => (
                      <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          {inv.partner?.name ?? inv.partner_id} · {inv.invoice_number} · {formatCurrency(Number(inv.amount_incl_vat ?? 0))}
                          {(inv.allocations?.length ?? 0) > 0 && " (door de partner per onderdeel geregistreerd)"}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={createLines.isPending}
                          onClick={() => createLines.mutate(inv)}
                        >
                          Orderregels aanmaken
                        </Button>
                      </li>
                    ))}
                  </ul>
                </Notice>
              )}

              {openLines.length === 0 ? (
                <EmptyState
                  title="Alle inkoopregels zijn verwerkt"
                  description="Nieuwe inkoopfacturen verschijnen hier zodra ze zijn geregistreerd."
                />
              ) : (
                <div className="space-y-4">
                  {groupByInvoice(openLines).map(({ invoice, groupLines }) => renderInvoiceGroup(invoice, groupLines, "open"))}
                </div>
              )}

              {processedLines.length > 0 && (
                <div className="space-y-2">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => setShowProcessed((v) => !v)}
                  >
                    {showProcessed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    Verwerkt ({processedLines.length})
                  </button>
                  {showProcessed && (
                    <div className="space-y-4">
                      {groupByInvoice(processedLines).map(({ invoice, groupLines }) => renderInvoiceGroup(invoice, groupLines, "processed"))}
                    </div>
                  )}
                </div>
              )}

              {toConfirm.total > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
                  <span className="text-xs text-muted-foreground">
                    {toConfirm.total} {toConfirm.total === 1 ? "besluit" : "besluiten"} klaar om te bevestigen
                  </span>
                  <Button size="sm" onClick={handleConfirm} disabled={busy}>
                    {busy && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    Bevestig ({toConfirm.total})
                  </Button>
                </div>
              )}
            </div>

            {/* Rechts: programma */}
            <div className="space-y-3 min-w-0">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Programma</h4>
              {programItems.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Dit project heeft geen programma-onderdelen. Inkoopregels worden als kostenposten doorbelast.
                </p>
              )}
              <div className="space-y-2">
                {programItems.map((item) => {
                  const actual = linesByItem[item.id];
                  const actualIncl = actual && actual.length > 0 ? sumIncl(actual) : null;
                  const quoted = item.quoted_price != null ? Number(item.quoted_price) : null;
                  const diff = actualIncl != null && quoted != null ? actualIncl - quoted : null;
                  const linkedOpen = openLines.filter((l) => drafts[l.id]?.kind === "item" && (drafts[l.id] as { itemId: string }).itemId === item.id).length;
                  return (
                    <div key={item.id} className="rounded-md border px-3 py-2 text-sm space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            <span className="text-muted-foreground">Dag {item.day_index + 1} · </span>
                            {item.block_name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{item.provider_name || item.provider_id}</div>
                        </div>
                        <div className="text-right text-xs tabular-nums shrink-0">
                          <div>Offerte {quoted != null ? formatCurrency(quoted) : "—"}</div>
                          <div className={cn(actualIncl != null ? "text-foreground font-medium" : "text-muted-foreground")}>
                            Werkelijk {actualIncl != null ? formatCurrency(actualIncl) : item.keep_quoted_price ? "offerte" : "—"}
                          </div>
                          {diff != null && Math.abs(diff) > 0.005 && (
                            <div className={cn(diff > 0 ? "text-warning-ink" : "text-success-ink")}>
                              {diff > 0 ? "+" : ""}{formatCurrency(diff)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                          <Switch
                            checked={!!item.keep_quoted_price}
                            disabled={togglingItem === item.id}
                            onCheckedChange={(v) => toggleKeepQuote(item, v)}
                            aria-label="Offerteprijs houden"
                          />
                          Offerteprijs houden
                        </label>
                        {linkedOpen > 0 && <Pill tone="info">{linkedOpen} {linkedOpen === 1 ? "regel" : "regels"} voorgesteld</Pill>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {(lodgingQuotes?.length ?? 0) > 0 && (
                <>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2">Logies</h4>
                  <div className="space-y-1.5">
                    {(lodgingQuotes ?? []).map((q) => (
                      <div key={q.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
                        <span className="truncate">
                          {q.accommodation_name}
                          <span className="ml-1 text-[10px] text-muted-foreground">({q.status})</span>
                        </span>
                        <span className="tabular-nums text-xs">{formatCurrency(Number(q.price_total ?? 0))}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {costItems.length > 0 && (
                <>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2">Overige kosten</h4>
                  <div className="space-y-1.5">
                    {costItems.map((item) => {
                      const incl = linesByItem[item.id]?.length ? sumIncl(linesByItem[item.id]) : Number(item.admin_price_override ?? 0);
                      return (
                        <div key={item.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
                          <span className="truncate">{item.block_name}</span>
                          <span className="tabular-nums text-xs">{formatCurrency(incl)}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {projects && (
                <p className="text-[10px] text-muted-foreground pt-2">
                  Een regel die bij een ander project hoort, kies je &ldquo;Hoort bij een ander project&rdquo;; de factuur wordt dan een verzamelfactuur.
                  {" "}Dit project: {projectLabel(projects.find((p) => p.id === requestId))}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
