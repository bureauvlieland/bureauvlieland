import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Receipt, Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useItemBillingLines } from "@/hooks/useItemBillingLines";
import {
  ProgramItemBillingLineInput,
  VAT_RATE_OPTIONS,
  computeBillingLineAmounts,
} from "@/types/programItemBillingLine";

interface AdminItemBillingLinesEditorProps {
  itemId: string;
  itemName: string;
  /** Suggested initial price when no lines exist yet (e.g. quoted_price) */
  suggestedAmount: number | null;
  /** Default VAT rate from the building block */
  defaultVatRate: number;
  disabled?: boolean;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

export const AdminItemBillingLinesEditor = ({
  itemId,
  itemName,
  suggestedAmount,
  defaultVatRate,
  disabled = false,
}: AdminItemBillingLinesEditorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { lines, saveAll, loading } = useItemBillingLines(itemId);
  const [draft, setDraft] = useState<ProgramItemBillingLineInput[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const hasLines = lines.length > 0;
  const totalIncl = lines.reduce((s, l) => s + Number(l.amount_incl_vat || 0), 0);

  // Initialize draft when opening
  useEffect(() => {
    if (!isOpen) return;
    if (lines.length > 0) {
      setDraft(
        lines.map((l) => ({
          description: l.description,
          quantity: Number(l.quantity),
          unit_price_excl_vat: Number(l.unit_price_excl_vat),
          vat_rate: Number(l.vat_rate),
          sort_order: l.sort_order,
        })),
      );
    } else {
      // Pre-fill with suggested amount, treating it as incl. VAT and back-calculating excl.
      const rate = defaultVatRate ?? 21;
      const incl = suggestedAmount ?? 0;
      const excl = incl > 0 ? Math.round((incl / (1 + rate / 100)) * 100) / 100 : 0;
      setDraft([
        {
          description: itemName,
          quantity: 1,
          unit_price_excl_vat: excl,
          vat_rate: rate,
          sort_order: 0,
        },
      ]);
    }
  }, [isOpen, lines, suggestedAmount, defaultVatRate, itemName]);

  const draftTotals = useMemo(() => {
    const byRate: Record<number, { excl: number; vat: number; incl: number }> = {};
    let totalExcl = 0;
    let totalVat = 0;
    draft.forEach((d) => {
      const a = computeBillingLineAmounts(d.quantity, d.unit_price_excl_vat, d.vat_rate);
      const r = d.vat_rate;
      if (!byRate[r]) byRate[r] = { excl: 0, vat: 0, incl: 0 };
      byRate[r].excl += a.amount_excl_vat;
      byRate[r].vat += a.vat_amount;
      byRate[r].incl += a.amount_incl_vat;
      totalExcl += a.amount_excl_vat;
      totalVat += a.vat_amount;
    });
    return { byRate, totalExcl, totalVat, totalIncl: totalExcl + totalVat };
  }, [draft]);

  const updateDraft = (idx: number, patch: Partial<ProgramItemBillingLineInput>) => {
    setDraft((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const addLine = () => {
    setDraft((prev) => [
      ...prev,
      {
        description: "",
        quantity: 1,
        unit_price_excl_vat: 0,
        vat_rate: defaultVatRate ?? 21,
        sort_order: prev.length,
      },
    ]);
  };

  const removeLine = (idx: number) => {
    setDraft((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const ok = await saveAll(draft);
    setIsSaving(false);
    if (ok) setIsOpen(false);
  };

  const handleClearAll = async () => {
    setIsSaving(true);
    const ok = await saveAll([]);
    setIsSaving(false);
    if (ok) setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-auto p-1.5 gap-1.5 font-normal",
            hasLines && "text-emerald-700 dark:text-emerald-400",
          )}
          disabled={disabled}
          title="Factuurregels (definitief)"
        >
          {hasLines ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">
                {lines.length} {lines.length === 1 ? "regel" : "regels"} · {formatCurrency(totalIncl)}
              </span>
            </>
          ) : (
            <>
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Factuurregels</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[680px] max-w-[95vw]" align="end">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm">Factuurregels (definitief)</h4>
            <p className="text-xs text-muted-foreground">
              Deze regels worden gebruikt op de verkoopfactuur. Mix van BTW-tarieven mogelijk binnen één onderdeel (bv. zaalhuur 21% + diner 9%).
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-medium">Omschrijving</th>
                      <th className="text-right px-2 py-1.5 font-medium w-16">Aantal</th>
                      <th className="text-right px-2 py-1.5 font-medium w-24">Prijs excl.</th>
                      <th className="text-right px-2 py-1.5 font-medium w-20">BTW%</th>
                      <th className="text-right px-2 py-1.5 font-medium w-24">Incl.</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {draft.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-muted-foreground">
                          Geen regels. Voeg er één toe.
                        </td>
                      </tr>
                    )}
                    {draft.map((line, idx) => {
                      const a = computeBillingLineAmounts(line.quantity, line.unit_price_excl_vat, line.vat_rate);
                      return (
                        <tr key={idx} className="border-t">
                          <td className="px-1 py-1">
                            <Input
                              className="h-8 text-xs"
                              value={line.description}
                              onChange={(e) => updateDraft(idx, { description: e.target.value })}
                              placeholder="Bv. zaalhuur"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              type="number"
                              step="0.01"
                              className="h-8 text-xs text-right"
                              value={line.quantity}
                              onChange={(e) => updateDraft(idx, { quantity: parseFloat(e.target.value) || 0 })}
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Input
                              type="number"
                              step="0.01"
                              className="h-8 text-xs text-right"
                              value={line.unit_price_excl_vat}
                              onChange={(e) => updateDraft(idx, { unit_price_excl_vat: parseFloat(e.target.value) || 0 })}
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Select
                              value={String(line.vat_rate)}
                              onValueChange={(v) => updateDraft(idx, { vat_rate: parseFloat(v) })}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {VAT_RATE_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={String(o.value)}>
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums">
                            {formatCurrency(a.amount_incl_vat)}
                          </td>
                          <td className="px-1 py-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => removeLine(idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Regel toevoegen
              </Button>

              {/* Totals */}
              <div className="bg-muted/30 rounded-md p-3 space-y-1 text-xs">
                {Object.entries(draftTotals.byRate)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([rate, amounts]) => (
                    <div key={rate} className="flex justify-between text-muted-foreground">
                      <span>BTW {rate}%</span>
                      <span className="tabular-nums">
                        excl. {formatCurrency(amounts.excl)} · BTW {formatCurrency(amounts.vat)}
                      </span>
                    </div>
                  ))}
                <div className="flex justify-between pt-1 border-t font-medium">
                  <span>Totaal excl. BTW</span>
                  <span className="tabular-nums">{formatCurrency(draftTotals.totalExcl)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>Totaal incl. BTW</span>
                  <span className="tabular-nums">{formatCurrency(draftTotals.totalIncl)}</span>
                </div>
              </div>

              <div className="flex justify-between gap-2 pt-2">
                {hasLines && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={isSaving}
                    className="text-destructive hover:text-destructive"
                  >
                    Alles wissen
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" size="sm" onClick={() => setIsOpen(false)} disabled={isSaving}>
                    Annuleren
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    Opslaan
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
