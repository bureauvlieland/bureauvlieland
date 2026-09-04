import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  summarizeLineAssignments,
  type AssignableLine,
  type LineTarget,
} from "@/lib/purchaseInvoiceLineAssignment";

export interface AssignableItemOption {
  id: string;
  label: string;
}

interface LineAssignmentBlockProps {
  /** De gescande factuurregels, al doorgerekend. */
  lines: AssignableLine[];
  /** Per regel de gekozen bestemming; even lang als `lines`. */
  targets: LineTarget[];
  onTargetsChange: (next: LineTarget[]) => void;
  /** Programma-onderdelen van dit project waarop geboekt kan worden. */
  items: AssignableItemOption[];
}

const TOURIST_TAX = "__tourist_tax__";
const UNASSIGNED = "__unassigned__";

const euro = (value: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value);

/**
 * Wijs elke gescande factuurregel een bestemming toe: een programma-onderdeel
 * (dan wordt hij doorbelast aan de klant en telt hij mee voor de commissie) of
 * toeristenbelasting (die regelt het bureau zelf en telt dus niet mee).
 *
 * Zo hoef je bedragen en btw-tarieven niet meer over te typen: die staan al in
 * de gescande regels.
 */
export function LineAssignmentBlock({
  lines,
  targets,
  onTargetsChange,
  items,
}: LineAssignmentBlockProps) {
  const summary = useMemo(
    () => summarizeLineAssignments(lines, targets),
    [lines, targets],
  );

  if (lines.length === 0) return null;

  const valueFor = (index: number): string => {
    const target = targets[index];
    if (!target || target.kind === "unassigned") return UNASSIGNED;
    if (target.kind === "tourist_tax") return TOURIST_TAX;
    return target.itemId || UNASSIGNED;
  };

  const setTarget = (index: number, value: string) => {
    const next = lines.map((_, i) => targets[i] ?? { kind: "unassigned" as const });
    next[index] = value === TOURIST_TAX
      ? { kind: "tourist_tax" }
      : value === UNASSIGNED
        ? { kind: "unassigned" }
        : { kind: "item", itemId: value };
    onTargetsChange(next);
  };

  const assignAllTo = (itemId: string) => {
    onTargetsChange(
      lines.map((_, i) => {
        // Een regel die al als toeristenbelasting is aangemerkt, blijft dat.
        const current = targets[i];
        if (current?.kind === "tourist_tax") return current;
        return { kind: "item" as const, itemId };
      }),
    );
  };

  return (
    <div className="space-y-3 rounded-md border border-border p-3 bg-muted/30">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <Label className="text-sm">Regels toewijzen</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Per gescande regel: welk programma-onderdeel. Wat je toewijst wordt aan de
            klant doorbelast en vormt de commissiegrondslag. Toeristenbelasting telt
            niet mee — die regelt het bureau zelf.
          </p>
        </div>
        {items.length === 1 && (
          <Button type="button" variant="outline" size="sm" onClick={() => assignAllTo(items[0].id)}>
            Alles op {items[0].label}
          </Button>
        )}
      </div>

      <div className="border rounded-md overflow-hidden bg-background">
        <div className="grid grid-cols-[1fr_200px_60px_90px] gap-2 px-2 py-2 bg-muted text-xs font-medium">
          <span>Omschrijving</span>
          <span>Onderdeel</span>
          <span className="text-right">BTW</span>
          <span className="text-right">Excl.</span>
        </div>
        {lines.map((line, idx) => {
          const value = valueFor(idx);
          const isUnassigned = value === UNASSIGNED;
          return (
            <div
              key={idx}
              className={cn(
                "grid grid-cols-[1fr_200px_60px_90px] gap-2 px-2 py-1.5 border-t items-center text-sm",
                isUnassigned && "bg-amber-50/60 dark:bg-amber-950/20",
              )}
            >
              <div className="truncate" title={line.description}>
                {line.description || <span className="text-muted-foreground">Regel {idx + 1}</span>}
              </div>
              <Select value={value} onValueChange={(v) => setTarget(idx, v)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>— Nog kiezen —</SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={TOURIST_TAX}>Toeristenbelasting (niet doorbelasten)</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-right tabular-nums text-muted-foreground">
                {line.vatRate}%
              </div>
              <div className="text-right tabular-nums">{euro(line.amountExclVat)}</div>
            </div>
          );
        })}
      </div>

      <div
        className={cn(
          "rounded-md border p-2 text-xs space-y-1",
          summary.isComplete
            ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
            : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
        )}
      >
        <div className="flex justify-between">
          <span>Doorbelasten aan de klant</span>
          <span className="tabular-nums font-medium">{euro(summary.assignedExclVat)}</span>
        </div>
        {summary.touristTaxExclVat > 0 && (
          <div className="flex justify-between opacity-80">
            <span>Toeristenbelasting (niet doorbelast)</span>
            <span className="tabular-nums">{euro(summary.touristTaxExclVat)}</span>
          </div>
        )}
        <div className="flex justify-between font-medium">
          <span>
            {summary.isComplete
              ? "Alle regels toegewezen"
              : `Nog te verdelen (${summary.unassignedCount} ${summary.unassignedCount === 1 ? "regel" : "regels"})`}
          </span>
          <span className="tabular-nums">{euro(summary.unassignedExclVat)}</span>
        </div>
      </div>
    </div>
  );
}
