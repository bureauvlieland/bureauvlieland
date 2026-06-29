import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchOptionalChildrenForBlock } from "@/hooks/useBlockComponents";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { BlockComponent } from "@/types/blockComponent";
import type { BuildingBlock } from "@/types/buildingBlock";


interface OptionalAddOnsStripProps {
  item: ProgramRequestItem;
  allItems: ProgramRequestItem[];
  quoteStatus?: string | null;
  readOnly?: boolean;
}

type OptionalChild = BlockComponent & { child: BuildingBlock | null };

const ALLOWED_PHASES = new Set([
  "offerte_verstuurd",
  "akkoord_ontvangen",
  "definitief_bevestigd",
]);

export const OptionalAddOnsStrip = ({
  item,
  allItems,
  quoteStatus,
  readOnly = false,
}: OptionalAddOnsStripProps) => {
  const { token } = useParams<{ token: string }>();
  const [options, setOptions] = useState<OptionalChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);

  const phaseAllows = quoteStatus ? ALLOWED_PHASES.has(quoteStatus) : false;
  const itemActive = item.status !== "cancelled" && !(item as any).executed_at;
  const canShow = !readOnly && phaseAllows && itemActive && !!item.block_id;

  useEffect(() => {
    if (!canShow || !item.block_id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchOptionalChildrenForBlock(item.block_id)
      .then((rows) => {
        if (!cancelled) setOptions(rows.filter((r) => r.child));
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canShow, item.block_id]);

  if (!canShow || loading) return null;
  if (options.length === 0) return null;

  // Hide options already added under this parent
  const alreadyAddedBlockIds = new Set(
    allItems
      .filter((it) => (it as any).parent_item_id === item.id && it.status !== "cancelled")
      .map((it) => it.block_id),
  );
  const available = options.filter((o) => o.child && !alreadyAddedBlockIds.has(o.child.id));
  if (available.length === 0) return null;

  const handleAdd = async (componentId: string, childName: string) => {
    if (!token) return;
    setAdding(componentId);
    try {
      const { data, error } = await supabase.functions.invoke(
        "customer-add-optional-component",
        { body: { token, parent_item_id: item.id, component_id: componentId } },
      );
      if (error || (data as any)?.error) {
        const msg = (data as any)?.error || error?.message || "Toevoegen mislukt";
        toast.error(typeof msg === "string" ? msg : "Toevoegen mislukt");
        return;
      }
      toast.success(`${childName} toegevoegd aan uw programma`);
      // Vraag de pagina om de programma-data opnieuw te laden
      window.dispatchEvent(new CustomEvent("customer-program:refresh"));
    } catch (e) {
      console.error(e);
      toast.error("Toevoegen mislukt");
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="mt-4 pt-3 border-t border-dashed">
      <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <Sparkles className="h-3.5 w-3.5" />
        Bijbestellen
      </div>
      <div className="space-y-2">
        {available.map((opt) => {
          const child = opt.child!;
          const price = child.price_adult != null ? Number(child.price_adult) : null;
          const priceType = child.price_type;
          const priceLabel = price != null
            ? `€${price.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${
                priceType === "per_person" ? " p.p."
                : priceType === "per_person_per_day" ? " p.p.p.d."
                : ""
              }`
            : "Op aanvraag";
          return (
            <div
              key={opt.id}
              className="flex items-start gap-3 p-3 rounded-md border bg-muted/30"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{child.name}</span>
                  <span className="text-sm text-muted-foreground">· {priceLabel}</span>
                </div>
                {child.short_description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {child.short_description}
                  </p>
                )}
                {opt.notes && (
                  <p className="text-xs text-muted-foreground/80 italic mt-0.5">{opt.notes}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAdd(opt.id, child.name)}
                disabled={adding !== null}
              >
                {adding === opt.id ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                )}
                Toevoegen
              </Button>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Optionele extra's bij dit onderdeel. Na toevoegen vragen wij u nog om akkoord.
      </p>
    </div>
  );
};

