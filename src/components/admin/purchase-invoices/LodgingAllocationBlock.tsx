import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getCommissionRate, EXTRA_CATEGORY_LABELS, type ExtraCategory } from "@/lib/commissionRates";

export type LodgingTarget = "skip" | "room" | "extra" | "tourist_tax";

export interface LodgingLineAllocation {
  target: LodgingTarget;
  category?: ExtraCategory;
  /** AI-suggestie metadata voor UI-badge */
  aiConfidence?: number;
  aiReason?: string;
}

export interface LodgingAllocationLine {
  description: string;
  amount_incl_vat: number;
  amount_excl_vat: number;
  vat_rate: number;
}

interface AccommodationQuoteOption {
  id: string;
  partner_id: string | null;
  accommodation_name: string;
  price_total: number;
  vat_rate: number;
  status: string;
  request_id: string;
}

interface Props {
  /** request_id van het project (program_request.id) — gebruikt om gekoppelde logies-aanvragen te vinden */
  programRequestId: string;
  /** Geselecteerde partner van de inkoopfactuur (logies-partner). */
  partnerId: string;
  /** PDF-factuurregels (na scan, of handmatig). */
  lines: LodgingAllocationLine[];
  /** Geselecteerde quote-id (optioneel — anders auto-selectie van eerste selected quote). */
  quoteId: string | null;
  onQuoteIdChange: (id: string | null) => void;
  /** Per regel: huidige target + categorie. */
  allocations: LodgingLineAllocation[];
  onAllocationsChange: (next: LodgingLineAllocation[]) => void;
  /** Of dit blok actief is (admin heeft "Boek op logies-offerte" gekozen). */
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
}

export function LodgingAllocationBlock({
  programRequestId,
  partnerId,
  lines,
  quoteId,
  onQuoteIdChange,
  allocations,
  onAllocationsChange,
  enabled,
  onEnabledChange,
}: Props) {
  const [aiLoading, setAiLoading] = useState(false);

  // Haal alle quotes op voor dit project (via accommodation_requests gelinkt aan program_request)
  const { data: quotes } = useQuery({
    queryKey: ["lodging-quotes-for-program", programRequestId, partnerId],
    queryFn: async () => {
      // accommodation_requests.linked_program_id = program_request.id
      const { data: reqs } = await supabase
        .from("accommodation_requests")
        .select("id")
        .eq("linked_program_id", programRequestId);
      const reqIds = (reqs || []).map((r) => r.id);
      if (reqIds.length === 0) return [];
      let q = supabase
        .from("accommodation_quotes")
        .select("id, partner_id, accommodation_name, price_total, vat_rate, status, request_id")
        .in("request_id", reqIds);
      if (partnerId) q = q.eq("partner_id", partnerId);
      const { data, error } = await q.order("status");
      if (error) throw error;
      return (data || []) as AccommodationQuoteOption[];
    },
    enabled: enabled && !!programRequestId,
  });

  // Haal partner-commissies op voor preview
  const { data: partner } = useQuery({
    queryKey: ["partner-commission-rates", partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      const { data } = await supabase
        .from("partners")
        .select("id, name, partner_type, commission_percentage, accommodation_commission_percentage, extras_commission_percentage")
        .eq("id", partnerId)
        .maybeSingle();
      return data;
    },
    enabled: !!partnerId,
  });

  // Auto-selectie: 'selected' quote, anders eerste
  useMemo(() => {
    if (!enabled || quoteId || !quotes || quotes.length === 0) return;
    const selected = quotes.find((q) => q.status === "selected") || quotes[0];
    onQuoteIdChange(selected.id);
  }, [enabled, quotes, quoteId, onQuoteIdChange]);

  const selectedQuote = quotes?.find((q) => q.id === quoteId);

  const updateLine = (idx: number, patch: Partial<LodgingLineAllocation>) => {
    const next = allocations.map((a, i) => (i === idx ? { ...a, ...patch } : a));
    onAllocationsChange(next);
  };

  const runAiClassification = async () => {
    if (lines.length === 0) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("classify-lodging-invoice-lines", {
        body: {
          partner_name: partner?.name || "",
          quote_context: selectedQuote
            ? `Geselecteerde offerte: ${selectedQuote.accommodation_name}, totaal €${selectedQuote.price_total}`
            : "",
          lines: lines.map((l) => ({
            description: l.description,
            quantity: 1,
            unit_price: l.amount_excl_vat,
            vat_rate: l.vat_rate,
          })),
        },
      });
      if (error) throw error;
      const suggestions: Array<{
        index: number;
        target: "room" | "extra" | "tourist_tax" | "exclude";
        extra_category?: ExtraCategory | null;
        confidence: number;
        reason: string;
      }> = data?.suggestions || [];

      const next: LodgingLineAllocation[] = allocations.map((a, i) => {
        const s = suggestions.find((x) => x.index === i);
        if (!s) return a;
        const target: LodgingTarget = s.target === "exclude" ? "skip" : s.target;
        return {
          target,
          category: s.target === "extra" ? (s.extra_category || "other") : undefined,
          aiConfidence: s.confidence,
          aiReason: s.reason,
        };
      });
      onAllocationsChange(next);
      toast.success(`AI heeft ${suggestions.length} regel(s) geclassificeerd`);
    } catch (e: any) {
      console.error("AI classify error:", e);
      toast.error(e.message || "AI-classificatie mislukt");
    } finally {
      setAiLoading(false);
    }
  };

  // Live preview commissie
  const preview = useMemo(() => {
    const roomLines = allocations
      .map((a, i) => ({ a, l: lines[i] }))
      .filter((x) => x.a.target === "room" && x.l);
    const extraByCat: Record<string, number> = {};
    allocations.forEach((a, i) => {
      const l = lines[i];
      if (!l || a.target !== "extra") return;
      const cat = a.category || "other";
      extraByCat[cat] = (extraByCat[cat] || 0) + Number(l.amount_incl_vat || 0);
    });
    const touristTax = allocations
      .map((a, i) => ({ a, l: lines[i] }))
      .filter((x) => x.a.target === "tourist_tax" && x.l)
      .reduce((s, x) => s + Number(x.l.amount_incl_vat || 0), 0);

    const roomTotal = roomLines.reduce((s, x) => s + Number(x.l.amount_incl_vat || 0), 0);
    const extrasTotal = Object.values(extraByCat).reduce((s, v) => s + v, 0);

    const lodgingRate = getCommissionRate(partner, "lodging");
    const extrasRate = getCommissionRate(partner, "extras");

    // Commissie is over ex BTW. Hier geven we een rough preview op basis van het
    // dominante BTW-tarief van de room-regels — admin ziet dit alleen als indicatie.
    const dominantRoomVat =
      roomLines.length > 0
        ? roomLines.map((x) => Number(x.l.vat_rate || 0))[0]
        : (selectedQuote?.vat_rate ?? 9);
    const roomExcl = roomTotal / (1 + Number(dominantRoomVat) / 100);
    const roomCommission = roomExcl * (lodgingRate / 100);

    // Voor extras: per categorie schat ex BTW (gebruik 9% als hint, admin ziet exact later)
    const extrasCommission = Object.entries(extraByCat).reduce((s, [_, total]) => {
      // approximate met 9% BTW als default voor F&B
      const excl = total / 1.09;
      return s + excl * (extrasRate / 100);
    }, 0);

    return { roomTotal, extraByCat, extrasTotal, touristTax, roomCommission, extrasCommission, lodgingRate, extrasRate };
  }, [allocations, lines, partner, selectedQuote]);

  if (!enabled) {
    return (
      <div className="rounded-md border border-dashed border-border p-3 bg-muted/20">
        <div className="flex items-center justify-between gap-2">
          <div>
            <Label className="text-sm">Logies-inkoopfactuur (1-op-1 doorzetten naar offerte)</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hotel-/logies-factuur? Schakel dit aan om kamer + F&B/faciliteiten over te zetten op de geselecteerde offerte. Toeristenbelasting wordt automatisch uitgesloten.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => onEnabledChange(true)}>
            Boek op logies-offerte
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border p-3 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <Label className="text-sm">Logies-allocatie</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Per regel: kamer / extra / toeristenbelasting (uitgesloten) / overslaan.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={runAiClassification} disabled={aiLoading || lines.length === 0}>
            {aiLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
            AI-suggesties
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onEnabledChange(false)}>
            Uitschakelen
          </Button>
        </div>
      </div>

      {/* Quote selector */}
      <div className="space-y-1">
        <Label className="text-xs">Logies-offerte (welke kamerprijs wordt overschreven?)</Label>
        {quotes && quotes.length > 0 ? (
          <Select value={quoteId || ""} onValueChange={(v) => onQuoteIdChange(v || null)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Kies offerte..." />
            </SelectTrigger>
            <SelectContent>
              {quotes.map((q) => (
                <SelectItem key={q.id} value={q.id}>
                  {q.accommodation_name} — €{Number(q.price_total).toFixed(2)} ({q.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-xs text-amber-600">
            Geen logies-offertes gevonden voor dit project{partnerId ? " bij deze partner" : ""}.
          </p>
        )}
      </div>

      {/* Per-regel target/category */}
      {lines.length > 0 && (
        <div className="border rounded-md overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_140px_80px] gap-2 px-2 py-2 bg-muted text-xs font-medium">
            <span>Omschrijving</span>
            <span>Doel</span>
            <span>Categorie</span>
            <span className="text-right">Incl.</span>
          </div>
          {lines.map((line, idx) => {
            const a = allocations[idx] || { target: "skip" as LodgingTarget };
            return (
              <div key={idx} className="grid grid-cols-[1fr_120px_140px_80px] gap-2 px-2 py-1.5 border-t items-center text-sm">
                <div className="truncate">
                  <div className="truncate">{line.description}</div>
                  {a.aiConfidence != null && (
                    <Badge variant="outline" className="h-4 px-1 text-[10px] mt-0.5">
                      AI {Math.round(a.aiConfidence * 100)}%
                    </Badge>
                  )}
                </div>
                <Select value={a.target} onValueChange={(v) => updateLine(idx, { target: v as LodgingTarget })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">— Overslaan —</SelectItem>
                    <SelectItem value="room">Kamer</SelectItem>
                    <SelectItem value="extra">Extra</SelectItem>
                    <SelectItem value="tourist_tax">Toeristenbel. (uit)</SelectItem>
                  </SelectContent>
                </Select>
                {a.target === "extra" ? (
                  <Select value={a.category || "other"} onValueChange={(v) => updateLine(idx, { category: v as ExtraCategory })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(EXTRA_CATEGORY_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-xs text-muted-foreground">—</div>
                )}
                <div className="text-right tabular-nums">€{Number(line.amount_incl_vat).toFixed(2)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Commissie-preview */}
      {(preview.roomTotal > 0 || preview.extrasTotal > 0) && (
        <div className="rounded-md bg-background border border-border p-2 text-xs space-y-1">
          <div className="font-medium text-foreground">Commissie-preview (richting hotel)</div>
          {preview.roomTotal > 0 && (
            <div className="flex justify-between">
              <span>Kamer €{preview.roomTotal.toFixed(2)} incl · {preview.lodgingRate}% logies-commissie</span>
              <span className="tabular-nums">≈ €{preview.roomCommission.toFixed(2)}</span>
            </div>
          )}
          {Object.entries(preview.extraByCat).map(([cat, total]) => (
            <div key={cat} className="flex justify-between">
              <span>{EXTRA_CATEGORY_LABELS[cat]} €{total.toFixed(2)} incl · {preview.extrasRate}% extras-commissie</span>
              <span className="tabular-nums">≈ €{(((total as number) / 1.09) * (preview.extrasRate / 100)).toFixed(2)}</span>
            </div>
          ))}
          {preview.touristTax > 0 && (
            <div className="flex justify-between text-muted-foreground italic">
              <span>Toeristenbelasting €{preview.touristTax.toFixed(2)} (uitgesloten — zit al in verkoopfactuur)</span>
              <span>—</span>
            </div>
          )}
          <div className="flex justify-between font-medium border-t pt-1 mt-1">
            <span>Totaal commissie-indicatie</span>
            <span className="tabular-nums">≈ €{(preview.roomCommission + preview.extrasCommission).toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            Indicatie — exacte commissie wordt later berekend op basis van werkelijke BTW per extra.
          </p>
        </div>
      )}
    </div>
  );
}
