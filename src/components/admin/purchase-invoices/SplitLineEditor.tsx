import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Notice } from "@/components/system";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { ProjectPickerPopover } from "./ProjectPickerPopover";
import type { PickableProject } from "@/hooks/usePickableProjects";
import type { PurchaseInvoiceLineRow } from "@/hooks/usePurchaseInvoiceLines";
import {
  splitLine,
  splitLineProportionally,
  type SplitPart,
  type SplitPartInput,
} from "@/lib/purchaseInvoiceLineSplit";

/**
 * Eén regel in delen knippen, elk deel met een bedrag incl. btw en een project.
 * Het laatste deel is het restant. Andere open regels van dezelfde factuur
 * (meestal de korting) kunnen in dezelfde verhouding meegaan.
 */

interface Props {
  line: PurchaseInvoiceLineRow;
  /** Andere nog niet doorbelaste regels van dezelfde factuur, om naar rato mee te splitsen. */
  otherLines: PurchaseInvoiceLineRow[];
  projects: PickableProject[] | undefined;
  saving: boolean;
  onCancel: () => void;
  onSave: (splits: Array<{ line: PurchaseInvoiceLineRow; parts: SplitPart[] }>) => void;
}

interface PartDraft {
  amount: string;
  request_id: string | null;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

const parseAmount = (raw: string): number | null => {
  const cleaned = raw.trim().replace(/\s|€/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

export function SplitLineEditor({ line, otherLines, projects, saving, onCancel, onSave }: Props) {
  const [parts, setParts] = useState<PartDraft[]>([
    { amount: "", request_id: null },
    { amount: "", request_id: null },
  ]);
  const [withOthers, setWithOthers] = useState<Set<string>>(new Set());

  const lineIncl = Number(line.amount_incl_vat) || 0;
  const fixedSum = useMemo(
    () => parts.slice(0, -1).reduce((s, p) => s + (parseAmount(p.amount) ?? 0), 0),
    [parts],
  );
  const remainder = Math.round((lineIncl - fixedSum) * 100) / 100;

  const inputs: SplitPartInput[] = parts.map((p, i) => ({
    amount_incl_vat: i === parts.length - 1 ? null : parseAmount(p.amount),
    request_id: p.request_id,
  }));
  const attempted = parts.slice(0, -1).some((p) => p.amount.trim() !== "");
  const result = attempted ? splitLine(line, inputs) : null;
  const error = result && result.ok === false ? result.error : null;
  const missingProject = parts.some((p) => !p.request_id);

  const updatePart = (idx: number, patch: Partial<PartDraft>) =>
    setParts((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  const addPart = () =>
    setParts((prev) => [...prev.slice(0, -1), { amount: "", request_id: null }, prev[prev.length - 1]]);
  const removePart = (idx: number) =>
    setParts((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx)));

  const handleSave = () => {
    const r = splitLine(line, inputs);
    if (!r.ok) return;
    const splits: Array<{ line: PurchaseInvoiceLineRow; parts: SplitPart[] }> = [{ line, parts: r.parts }];
    for (const other of otherLines) {
      if (!withOthers.has(other.id)) continue;
      const pr = splitLineProportionally(other, r.parts);
      if (pr.ok) splits.push({ line: other, parts: pr.parts });
    }
    onSave(splits);
  };

  return (
    <div className="mt-2 rounded-md border border-dashed bg-muted/30 p-3 space-y-2 text-sm">
      <div className="text-xs text-muted-foreground">
        Bedragen incl. btw; het laatste deel is het restant. Elk deel krijgt zijn eigen project en
        komt open in het werkblad van dat project.
      </div>
      <div className="space-y-1.5">
        {parts.map((p, idx) => {
          const isLast = idx === parts.length - 1;
          return (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-xs text-muted-foreground">Deel {idx + 1}</span>
              {isLast ? (
                <div className="h-8 w-32 shrink-0 rounded-md border bg-background px-2 flex items-center justify-end text-xs tabular-nums text-muted-foreground">
                  {formatCurrency(remainder)}
                </div>
              ) : (
                <Input
                  value={p.amount}
                  onChange={(e) => updatePart(idx, { amount: e.target.value })}
                  placeholder={lineIncl < 0 ? "-0,00" : "0,00"}
                  inputMode="decimal"
                  className="h-8 w-32 shrink-0 text-right text-xs tabular-nums"
                />
              )}
              <ProjectPickerPopover
                value={p.request_id}
                onChange={(id) => updatePart(idx, { request_id: id })}
                projects={projects}
                size="sm"
                className="max-w-[360px]"
              />
              {!isLast && parts.length > 2 && (
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removePart(idx)} title="Deel verwijderen">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addPart}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Deel toevoegen
      </Button>

      {otherLines.length > 0 && (
        <div className="space-y-1 pt-1">
          <div className="text-xs text-muted-foreground">Ook naar rato splitsen, met dezelfde projecten:</div>
          {otherLines.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={withOthers.has(o.id)}
                onCheckedChange={(v) =>
                  setWithOthers((prev) => {
                    const next = new Set(prev);
                    if (v) next.add(o.id); else next.delete(o.id);
                    return next;
                  })
                }
              />
              <span className="truncate">{o.description}</span>
              <span className="text-muted-foreground tabular-nums shrink-0">{formatCurrency(Number(o.amount_incl_vat))}</span>
            </label>
          ))}
        </div>
      )}

      {error && <Notice tone="warning">{error}</Notice>}
      {!error && attempted && missingProject && (
        <Notice tone="info">Kies voor elk deel een project; anders blijft dat deel zonder project staan.</Notice>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>Annuleren</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !attempted || !!error}>
          {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
          Splitsen in {parts.length} delen
        </Button>
      </div>
    </div>
  );
}
