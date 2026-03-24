import { useState, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { RefreshCw, ArrowRight, AlertCircle } from "lucide-react";

interface SyncField {
  key: string;
  label: string;
  enabled: boolean;
}

interface ItemDiff {
  itemId: string;
  itemName: string;
  blockId: string;
  hasQuotedPrice: boolean;
  changes: {
    field: string;
    fieldLabel: string;
    oldValue: string | null;
    newValue: string | null;
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
  const [diffs, setDiffs] = useState<ItemDiff[]>([]);

  useEffect(() => {
    if (open) {
      loadDiffs();
    }
  }, [open, requestId]);

  const loadDiffs = async () => {
    setLoading(true);
    try {
      // Fetch items with a block_id
      const { data: items, error: itemsErr } = await supabase
        .from("program_request_items")
        .select("id, block_id, block_name, block_category, admin_price_override, price_type, duration, location_lat, location_lng, location_address, external_url, quoted_price, status")
        .eq("request_id", requestId)
        .not("block_id", "is", null)
        .neq("status", "cancelled");

      if (itemsErr) throw itemsErr;
      if (!items?.length) {
        setDiffs([]);
        setLoading(false);
        return;
      }

      const blockIds = [...new Set(items.map(i => i.block_id!))];
      const { data: blocks, error: blocksErr } = await supabase
        .from("building_blocks")
        .select("id, name, category, price_adult, price_type, duration, location_lat, location_lng, location_address, external_url")
        .in("id", blockIds);

      if (blocksErr) throw blocksErr;

      const blockMap = new Map(blocks?.map(b => [b.id, b]) || []);

      const itemDiffs: ItemDiff[] = [];
      for (const item of items) {
        const block = blockMap.get(item.block_id!);
        if (!block) continue;

        const changes: ItemDiff["changes"] = [];

        // Map block fields to item fields
        const fieldMap: Record<string, { itemVal: unknown; blockVal: unknown }> = {
          admin_price_override: { itemVal: item.admin_price_override, blockVal: block.price_adult },
          price_type: { itemVal: item.price_type, blockVal: block.price_type },
          block_name: { itemVal: item.block_name, blockVal: block.name },
          block_category: { itemVal: item.block_category, blockVal: block.category },
          duration: { itemVal: item.duration, blockVal: block.duration },
          location_address: { itemVal: item.location_address, blockVal: block.location_address },
          external_url: { itemVal: item.external_url, blockVal: block.external_url },
        };

        for (const field of SYNC_FIELDS) {
          const mapping = fieldMap[field.key];
          if (!mapping) continue;
          const oldStr = mapping.itemVal == null ? null : String(mapping.itemVal);
          const newStr = mapping.blockVal == null ? null : String(mapping.blockVal);
          if (oldStr !== newStr) {
            changes.push({
              field: field.key,
              fieldLabel: field.label,
              oldValue: formatValue(field.key, mapping.itemVal),
              newValue: formatValue(field.key, mapping.blockVal),
            });
          }
        }

        // Also track location lat/lng silently (sync when address syncs)
        if (changes.length > 0) {
          itemDiffs.push({
            itemId: item.id,
            itemName: item.block_name,
            blockId: item.block_id!,
            hasQuotedPrice: item.quoted_price != null,
            changes,
          });
        }
      }

      setDiffs(itemDiffs);
    } catch (err) {
      console.error("Error loading diffs:", err);
      toast.error("Kon bouwsteendata niet laden");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    const enabledKeys = new Set(fields.filter(f => f.enabled).map(f => f.key));

    try {
      // Fetch full block data for updates
      const blockIds = [...new Set(diffs.map(d => d.blockId))];
      const { data: blocks } = await supabase
        .from("building_blocks")
        .select("id, name, category, price_adult, price_type, duration, location_lat, location_lng, location_address, external_url")
        .in("id", blockIds);

      const blockMap = new Map(blocks?.map(b => [b.id, b]) || []);
      let updated = 0;

      for (const diff of diffs) {
        // Skip items with quoted_price when syncing price
        const relevantChanges = diff.changes.filter(c => enabledKeys.has(c.field));
        if (relevantChanges.length === 0) continue;

        const block = blockMap.get(diff.blockId);
        if (!block) continue;

        const updateData: Record<string, unknown> = {};

        for (const change of relevantChanges) {
          // Skip price sync for items with quoted_price
          if (change.field === "admin_price_override" && diff.hasQuotedPrice) continue;

          switch (change.field) {
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
            .eq("id", diff.itemId);

          if (error) {
            console.error(`Error updating item ${diff.itemId}:`, error);
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

  const toggleField = (key: string) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f));
  };

  const applicableDiffs = diffs.filter(d => {
    const enabledKeys = new Set(fields.filter(f => f.enabled).map(f => f.key));
    return d.changes.some(c => enabledKeys.has(c.field));
  });

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
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Bezig met vergelijken...</div>
        ) : diffs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Alle onderdelen zijn al up-to-date met de bouwstenen.
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

            {/* Diffs list */}
            <ScrollArea className="flex-1 min-h-0 max-h-[400px]">
              <div className="space-y-3 pr-4">
                {diffs.map(diff => {
                  const enabledKeys = new Set(fields.filter(f => f.enabled).map(f => f.key));
                  const visibleChanges = diff.changes.filter(c => enabledKeys.has(c.field));
                  if (visibleChanges.length === 0) return null;

                  return (
                    <div key={diff.itemId} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{diff.itemName}</span>
                        {diff.hasQuotedPrice && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Partnerprijs behouden
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        {visibleChanges.map(change => {
                          const skipped = change.field === "admin_price_override" && diff.hasQuotedPrice;
                          return (
                            <div
                              key={change.field}
                              className={cn("flex items-center gap-2 text-xs", skipped && "opacity-40 line-through")}
                            >
                              <span className="text-muted-foreground w-24 shrink-0">{change.fieldLabel}</span>
                              <span className="text-destructive">{change.oldValue}</span>
                              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="text-primary font-medium">{change.newValue}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            onClick={handleSync}
            disabled={syncing || loading || applicableDiffs.length === 0}
          >
            {syncing ? "Bezig..." : `Synchroniseer ${applicableDiffs.length} onderdelen`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
