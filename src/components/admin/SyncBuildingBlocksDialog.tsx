import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";
import { RefreshCw, ArrowRight, AlertCircle } from "lucide-react";

interface SyncField {
  key: string;
  label: string;
  enabled: boolean;
}

interface ItemRow {
  itemId: string;
  itemName: string;
  blockId: string;
  hasQuotedPrice: boolean;
  rows: {
    field: string;
    fieldLabel: string;
    oldValue: string | null;
    newValue: string | null;
    isChanged: boolean;
  }[];
}

interface SyncBuildingBlocksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  onSuccess: () => void;
}

const SYNC_FIELDS: SyncField[] = [
  { key: "admin_price_override", label: "Prijs (volwassene)", enabled: true },
  { key: "price_type", label: "Prijstype", enabled: true },
  { key: "block_name", label: "Naam", enabled: true },
  { key: "block_category", label: "Categorie", enabled: true },
  { key: "duration", label: "Duur", enabled: true },
  { key: "location_address", label: "Locatie", enabled: true },
  { key: "external_url", label: "Externe URL", enabled: true },
];

const formatValue = (key: string, val: unknown): string => {
  if (val == null || val === "") return "—";
  if (key === "admin_price_override") return `€ ${Number(val).toFixed(2)}`;
  return String(val);
};

export function SyncBuildingBlocksDialog({
  open,
  onOpenChange,
  requestId,
  onSuccess,
}: SyncBuildingBlocksDialogProps) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [fields, setFields] = useState<SyncField[]>(SYNC_FIELDS.map(f => ({ ...f })));
  const [items, setItems] = useState<ItemRow[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      loadDiffs();
    }
  }, [open, requestId]);

  const loadDiffs = async () => {
    setLoading(true);
    try {
      const { data: itemsData, error: itemsErr } = await supabase
        .from("program_request_items")
        .select("id, block_id, block_name, block_category, admin_price_override, price_type, duration, location_lat, location_lng, location_address, external_url, quoted_price, status")
        .eq("request_id", requestId)
        .not("block_id", "is", null)
        .neq("status", "cancelled");

      if (itemsErr) throw itemsErr;
      if (!itemsData?.length) {
        setItems([]);
        setSelectedItemIds(new Set());
        setLoading(false);
        return;
      }

      const blockIds = [...new Set(itemsData.map(i => i.block_id!))];
      const { data: blocks, error: blocksErr } = await supabase
        .from("building_blocks")
        .select("id, name, category, price_adult, price_type, duration, location_lat, location_lng, location_address, external_url")
        .in("id", blockIds);

      if (blocksErr) throw blocksErr;

      const blockMap = new Map(blocks?.map(b => [b.id, b]) || []);

      const itemRows: ItemRow[] = [];
      const defaultSelected = new Set<string>();

      for (const item of itemsData) {
        const block = blockMap.get(item.block_id!);
        if (!block) continue;

        const fieldMap: Record<string, { itemVal: unknown; blockVal: unknown }> = {
          admin_price_override: { itemVal: item.admin_price_override, blockVal: block.price_adult },
          price_type: { itemVal: item.price_type, blockVal: block.price_type },
          block_name: { itemVal: item.block_name, blockVal: block.name },
          block_category: { itemVal: item.block_category, blockVal: block.category },
          duration: { itemVal: item.duration, blockVal: block.duration },
          location_address: { itemVal: item.location_address, blockVal: block.location_address },
          external_url: { itemVal: item.external_url, blockVal: block.external_url },
        };

        const rows = SYNC_FIELDS.map(field => {
          const mapping = fieldMap[field.key];
          const oldStr = mapping?.itemVal == null ? null : String(mapping.itemVal);
          const newStr = mapping?.blockVal == null ? null : String(mapping.blockVal);
          return {
            field: field.key,
            fieldLabel: field.label,
            oldValue: formatValue(field.key, mapping?.itemVal),
            newValue: formatValue(field.key, mapping?.blockVal),
            isChanged: oldStr !== newStr,
          };
        });

        const hasChanges = rows.some(r => r.isChanged);

        itemRows.push({
          itemId: item.id,
          itemName: item.block_name,
          blockId: item.block_id!,
          hasQuotedPrice: item.quoted_price != null,
          rows,
        });

        if (hasChanges) defaultSelected.add(item.id);
      }

      setItems(itemRows);
      setSelectedItemIds(defaultSelected);
    } catch (err) {
      console.error("Error loading diffs:", err);
      toast.error("Kon bouwsteendata niet laden");
    } finally {
      setLoading(false);
    }
  };

  const toggleField = (key: string) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f));
  };

  const toggleItem = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedItemIds(new Set(items.map(i => i.itemId)));
  const selectChangedOnly = () =>
    setSelectedItemIds(new Set(items.filter(i => i.rows.some(r => r.isChanged)).map(i => i.itemId)));
  const selectNone = () => setSelectedItemIds(new Set());

  const enabledFieldKeys = useMemo(
    () => new Set(fields.filter(f => f.enabled).map(f => f.key)),
    [fields]
  );

  const effectiveCount = useMemo(() => {
    let count = 0;
    for (const item of items) {
      if (!selectedItemIds.has(item.itemId)) continue;
      const hasEffectiveField = item.rows.some(r => {
        if (!enabledFieldKeys.has(r.field)) return false;
        if (r.field === "admin_price_override" && item.hasQuotedPrice) return false;
        return true;
      });
      if (hasEffectiveField) count++;
    }
    return count;
  }, [items, selectedItemIds, enabledFieldKeys]);

  const changedItemsCount = items.filter(i => i.rows.some(r => r.isChanged)).length;

  const handleSync = async () => {
    setSyncing(true);
    try {
      const blockIds = [...new Set(items.filter(i => selectedItemIds.has(i.itemId)).map(i => i.blockId))];
      const { data: blocks } = await supabase
        .from("building_blocks")
        .select("id, name, category, price_adult, price_type, duration, location_lat, location_lng, location_address, external_url")
        .in("id", blockIds);

      const blockMap = new Map(blocks?.map(b => [b.id, b]) || []);
      let updated = 0;

      for (const item of items) {
        if (!selectedItemIds.has(item.itemId)) continue;

        const block = blockMap.get(item.blockId);
        if (!block) continue;

        const updateData: Record<string, unknown> = {};

        for (const field of fields) {
          if (!field.enabled) continue;
          if (field.key === "admin_price_override" && item.hasQuotedPrice) continue;

          switch (field.key) {
            case "admin_price_override":
              updateData.admin_price_override = block.price_adult;
              break;
            case "price_type":
              updateData.price_type = block.price_type;
              break;
            case "block_name":
              updateData.block_name = block.name;
              break;
            case "block_category":
              updateData.block_category = block.category;
              break;
            case "duration":
              updateData.duration = block.duration;
              break;
            case "location_address":
              updateData.location_address = block.location_address;
              updateData.location_lat = block.location_lat;
              updateData.location_lng = block.location_lng;
              break;
            case "external_url":
              updateData.external_url = block.external_url;
              break;
          }
        }

        if (Object.keys(updateData).length > 0) {
          const { error } = await supabase
            .from("program_request_items")
            .update(updateData)
            .eq("id", item.itemId);

          if (error) {
            console.error(`Error updating item ${item.itemId}:`, error);
          } else {
            updated++;
          }
        }
      }

      toast.success(`${updated} onderdelen gesynchroniseerd`);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("Synchronisatie mislukt");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Synchroniseer bouwstenen
          </DialogTitle>
          <DialogDescription>
            Werk programma-onderdelen bij met actuele prijzen, locaties en gegevens uit de bouwstenen.
            Vink per onderdeel aan wat overschreven moet worden — ook als het al gelijk is.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Bezig met vergelijken...</div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Geen onderdelen gekoppeld aan bouwstenen.
          </div>
        ) : (
          <>
            {/* Field selection */}
            <div className="flex flex-wrap gap-3 pb-2 border-b">
              {fields.map(field => (
                <label key={field.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={field.enabled}
                    onCheckedChange={() => toggleField(field.key)}
                  />
                  {field.label}
                </label>
              ))}
            </div>

            {/* Summary + bulk select */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
              <span>
                {changedItemsCount} van {items.length} onderdelen heeft wijzigingen t.o.v. de bouwstenen.
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={selectAll}>Alles</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={selectChangedOnly}>Alleen wijzigingen</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={selectNone}>Geen</Button>
              </div>
            </div>

            {/* Items list */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
              {items.map(item => {
                const checked = selectedItemIds.has(item.itemId);
                const visibleRows = item.rows.filter(r => enabledFieldKeys.has(r.field));
                const itemHasChanges = item.rows.some(r => r.isChanged);

                return (
                  <div
                    key={item.itemId}
                    className={cn(
                      "rounded-lg border p-3 space-y-2 transition-opacity",
                      !checked && "opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                        <Checkbox checked={checked} onCheckedChange={() => toggleItem(item.itemId)} />
                        <span className="font-medium text-sm truncate">{item.itemName}</span>
                        {!itemHasChanges && (
                          <Badge variant="secondary" className="text-xs">Up-to-date</Badge>
                        )}
                      </label>
                      {item.hasQuotedPrice && (
                        <Badge variant="outline" className="text-xs gap-1 shrink-0">
                          <AlertCircle className="h-3 w-3" />
                          Partnerprijs behouden
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 pl-6">
                      {visibleRows.map(row => {
                        const skipped = row.field === "admin_price_override" && item.hasQuotedPrice;
                        return (
                          <div
                            key={row.field}
                            className={cn(
                              "flex items-center gap-2 text-xs",
                              skipped && "opacity-40 line-through",
                              !row.isChanged && "text-muted-foreground"
                            )}
                          >
                            <span className="text-muted-foreground w-24 shrink-0">{row.fieldLabel}</span>
                            <span className={row.isChanged ? "text-destructive" : ""}>{row.oldValue}</span>
                            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className={row.isChanged ? "text-primary font-medium" : ""}>{row.newValue}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            onClick={handleSync}
            disabled={syncing || loading || effectiveCount === 0}
          >
            {syncing ? "Bezig..." : `Synchroniseer ${effectiveCount} onderdelen`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
