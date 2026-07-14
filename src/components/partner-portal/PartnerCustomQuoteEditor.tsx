import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, FileText, Send } from "lucide-react";
import { computeQuoteLineTotals, isValidLine, type QuoteLine } from "@/lib/customQuoteLines";

interface Props {
  itemId: string;
  partnerId: string;
  briefing?: string | null;
  onSubmitted: (totalInclVat: number, notes: string) => Promise<boolean>;
}

const VAT_OPTIONS = [
  { value: "0", label: "0%" },
  { value: "9", label: "9%" },
  { value: "21", label: "21%" },
];

function emptyLine(sort: number): QuoteLine & { _key: string } {
  return {
    _key: `new-${sort}-${Math.random().toString(36).slice(2, 8)}`,
    sort_order: sort,
    description: "",
    quantity: 1,
    unit: "",
    unit_price_incl_vat: 0,
    vat_rate: 21,
  } as any;
}

export function PartnerCustomQuoteEditor({ itemId, partnerId, briefing, onSubmitted }: Props) {
  const [lines, setLines] = useState<(QuoteLine & { _key: string })[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("program_request_item_quote_lines")
        .select("*")
        .eq("item_id", itemId)
        .order("sort_order");
      const existing = (data || []).map((r: any, i: number) => ({
        _key: r.id,
        id: r.id,
        sort_order: r.sort_order ?? i,
        description: r.description,
        quantity: Number(r.quantity),
        unit: r.unit ?? "",
        unit_price_incl_vat: Number(r.unit_price_incl_vat),
        vat_rate: Number(r.vat_rate),
      }));
      setLines(existing.length ? existing : [emptyLine(0)]);
      setLoading(false);
    })();
  }, [itemId]);

  const totals = useMemo(() => computeQuoteLineTotals(lines), [lines]);

  const updateLine = (key: string, patch: Partial<QuoteLine>) => {
    setLines((prev) => prev.map((l) => (l._key === key ? { ...l, ...patch } : l)));
  };
  const addLine = () => setLines((prev) => [...prev, emptyLine(prev.length)]);
  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l._key !== key));

  const handleSubmit = async () => {
    const valid = lines.filter((l) => isValidLine(l));
    if (valid.length === 0) {
      toast.error("Voeg minimaal één geldige regel toe");
      return;
    }
    setSaving(true);
    try {
      // Vervang alle regels: delete oude + insert nieuwe (partner heeft RLS)
      const { error: delErr } = await supabase
        .from("program_request_item_quote_lines")
        .delete()
        .eq("item_id", itemId);
      if (delErr) throw delErr;

      const rows = valid.map((l, idx) => ({
        item_id: itemId,
        sort_order: idx,
        description: l.description.trim(),
        quantity: l.quantity,
        unit: l.unit || null,
        unit_price_incl_vat: l.unit_price_incl_vat,
        vat_rate: l.vat_rate,
        created_by_partner_id: partnerId,
      }));
      const { error: insErr } = await supabase
        .from("program_request_item_quote_lines")
        .insert(rows);
      if (insErr) throw insErr;

      // De trigger updatet quoted_price. Nu status naar bevestigd via bestaande flow.
      const ok = await onSubmitted(totals.incl_vat, notes);
      if (ok) toast.success("Offerte ingediend bij Bureau Vlieland");
    } catch (e: any) {
      console.error(e);
      toast.error("Kon offerte niet opslaan", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Regels laden…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {briefing && (
        <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4" /> Briefing van Bureau Vlieland
          </div>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{briefing}</p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-semibold">Offerteregels</Label>
          <Button size="sm" variant="outline" onClick={addLine}>
            <Plus className="h-4 w-4 mr-1" /> Regel
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Voer prijzen <strong>inclusief BTW</strong> in. Kies per regel het juiste BTW-tarief.
        </p>

        <div className="space-y-2">
          {lines.map((line) => (
            <div key={line._key} className="rounded-lg border p-3 space-y-2 bg-background">
              <Input
                placeholder="Omschrijving (bv. Champagne per glas, incl. bediening)"
                value={line.description}
                onChange={(e) => updateLine(line._key, { description: e.target.value })}
              />
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-3">
                  <Label className="text-[11px] text-muted-foreground">Aantal</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.quantity}
                    onChange={(e) => updateLine(line._key, { quantity: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-[11px] text-muted-foreground">Eenheid</Label>
                  <Input
                    placeholder="stuk / pp / uur"
                    value={line.unit || ""}
                    onChange={(e) => updateLine(line._key, { unit: e.target.value })}
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-[11px] text-muted-foreground">Prijs / stuk (incl.)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unit_price_incl_vat}
                    onChange={(e) =>
                      updateLine(line._key, { unit_price_incl_vat: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-[11px] text-muted-foreground">BTW</Label>
                  <Select
                    value={String(line.vat_rate)}
                    onValueChange={(v) => updateLine(line._key, { vat_rate: Number(v) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VAT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 flex items-end justify-end">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeLine(line._key)}
                    disabled={lines.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-right text-muted-foreground">
                Regeltotaal: €{(line.quantity * line.unit_price_incl_vat).toFixed(2).replace(".", ",")} incl.
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Totaal excl. BTW</span>
          <span>€{totals.excl_vat.toFixed(2).replace(".", ",")}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>BTW</span>
          <span>€{totals.vat_amount.toFixed(2).replace(".", ",")}</span>
        </div>
        <div className="flex justify-between font-semibold text-base pt-1 border-t">
          <span>Totaal incl. BTW</span>
          <span>€{totals.incl_vat.toFixed(2).replace(".", ",")}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quote-notes" className="text-sm">Toelichting (optioneel)</Label>
        <Textarea
          id="quote-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Bv. voorwaarden, aannames, wat is inbegrepen."
        />
      </div>

      <Button className="w-full" onClick={handleSubmit} disabled={saving || totals.incl_vat <= 0}>
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
        Offerte indienen bij Bureau Vlieland
      </Button>
    </div>
  );
}
