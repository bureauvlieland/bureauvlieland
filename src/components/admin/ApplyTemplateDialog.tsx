import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePublishedTemplates, useTemplateWithItems } from "@/hooks/useProgramTemplates";
import { toast } from "sonner";
import { logAdminActivity, EntityTypes } from "@/lib/adminLogger";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Layers, Check } from "lucide-react";

interface ApplyTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  onSuccess: () => void;
}

export const ApplyTemplateDialog = ({
  open,
  onOpenChange,
  requestId,
  onSuccess,
}: ApplyTemplateDialogProps) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const { data: templates, isLoading: templatesLoading } = usePublishedTemplates();
  const { data: selectedTemplate, isLoading: detailLoading } = useTemplateWithItems(selectedTemplateId);

  const handleApply = async () => {
    if (!selectedTemplate?.items?.length) return;
    setIsApplying(true);

    try {
      // Collect all unique block_ids to fetch building block data (provider info)
      const blockIds = [...new Set(selectedTemplate.items.map((i) => i.block_id))];
      const { data: blocks, error: blocksError } = await supabase
        .from("building_blocks")
        .select("*")
        .in("id", blockIds);

      if (blocksError) throw blocksError;

      const blockMap = new Map(blocks?.map((b) => [b.id, b]) || []);

      // Build insert rows and insert directly
      const rowsToInsert = selectedTemplate.items
        .map((item) => {
          const block = blockMap.get(item.block_id);
          if (!block) return null;

          return {
            request_id: requestId,
            block_id: block.id,
            block_name: block.name,
            block_category: block.category as string,
            block_type: block.block_type as string,
            provider_id: block.provider_id || "bureau-vlieland",
            provider_name: block.provider_id ? "" : "Bureau Vlieland",
            provider_email: null as string | null,
            day_index: item.day_index,
            preferred_time: item.preferred_time,
            status: "pending",
            item_quote_status: "concept",
            skip_partner_notification: true,
            admin_price_override: block.price_adult || null,
            price_type: block.price_type || "per_person",
            duration: block.duration || null,
            admin_price_notes: block.description || block.short_description || block.price_adult_note || null,
          };
        })
        .filter((r) => r !== null);

      // Enrich provider names from partners table
      const partnerIds = [...new Set(rowsToInsert.map((r) => r.provider_id).filter((id) => id !== "bureau-vlieland"))];
      if (partnerIds.length > 0) {
        const { data: partners } = await supabase
          .from("partners")
          .select("id, name, email")
          .in("id", partnerIds);

        const partnerMap = new Map(partners?.map((p) => [p.id, p]) || []);
        rowsToInsert.forEach((row) => {
          const partner = partnerMap.get(row.provider_id);
          if (partner) {
            row.provider_name = partner.name;
            row.provider_email = partner.email;
          }
        });
      }

      const { error: insertError } = await supabase
        .from("program_request_items")
        .insert(rowsToInsert as any);

      if (insertError) throw insertError;

      await logAdminActivity({
        action: "template_applied",
        entityType: EntityTypes.REQUEST,
        entityId: requestId,
        details: {
          template_id: selectedTemplate.id,
          template_name: selectedTemplate.name,
          items_added: rowsToInsert.length,
        },
      });

      toast.success(`Template "${selectedTemplate.name}" toegepast (${rowsToInsert.length} activiteiten toegevoegd)`);
      onOpenChange(false);
      setSelectedTemplateId(null);
      onSuccess();
    } catch (error) {
      console.error("Error applying template:", error);
      toast.error("Fout bij toepassen template");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Template toepassen</DialogTitle>
          <DialogDescription>
            Selecteer een voorbeeldprogramma om alle bouwstenen toe te voegen aan dit project.
            Bestaande activiteiten blijven behouden.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: "50vh" }}>
          <div className="space-y-3 pr-4">
            {templatesLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)
            ) : !templates?.length ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Geen gepubliceerde templates beschikbaar.
              </p>
            ) : (
              templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`w-full text-left border rounded-lg p-4 transition-colors hover:bg-accent/50 ${
                    selectedTemplateId === tpl.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{tpl.name}</div>
                    {selectedTemplateId === tpl.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {tpl.duration_days} {tpl.duration_days === 1 ? "dag" : "dagen"}
                    </span>
                    {tpl.indicative_price_pp && (
                      <span>± €{tpl.indicative_price_pp} p.p.</span>
                    )}
                  </div>
                  {tpl.short_description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {tpl.short_description}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Preview of selected template */}
          {selectedTemplateId && (
            <>
              <Separator className="my-4" />
              {detailLoading ? (
                <Skeleton className="h-32" />
              ) : selectedTemplate?.items?.length ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Bouwstenen ({selectedTemplate.items.length})
                  </h4>
                  {Array.from(
                    new Set(selectedTemplate.items.map((i) => i.day_index))
                  )
                    .sort()
                    .map((dayIdx) => (
                      <div key={dayIdx} className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Dag {dayIdx + 1}
                        </p>
                        {selectedTemplate.items!
                          .filter((i) => i.day_index === dayIdx)
                          .map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-sm pl-3 py-1 border-l-2 border-primary/30"
                            >
                              <span>{item.block?.name || item.block_id}</span>
                              {item.preferred_time && (
                                <Badge variant="outline" className="text-xs">
                                  {item.preferred_time}
                                </Badge>
                              )}
                            </div>
                          ))}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Geen bouwstenen in deze template.
                </p>
              )}
            </>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedTemplate?.items?.length || isApplying}
          >
            {isApplying ? "Toepassen..." : "Toepassen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
