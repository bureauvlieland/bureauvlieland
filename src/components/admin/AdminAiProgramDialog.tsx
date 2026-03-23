import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, Check, Calendar, Users } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface AdminAiProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  numberOfPeople: number;
  selectedDates: string[];
  customerDescription: string | null;
  onSuccess: () => void;
  invoicingMode?: string;
}

interface AiSuggestion {
  block_id: string;
  day_index: number;
  preferred_time?: string;
}

interface BlockInfo {
  id: string;
  name: string;
  category: string;
  block_type: string;
  provider_id: string | null;
  price_adult: number | null;
  price_type: string | null;
  price_adult_note: string | null;
  short_description: string | null;
  description: string | null;
  duration: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  external_url: string | null;
}

const vibeOptions = [
  { value: "actief", label: "Actief & sportief", emoji: "🏄" },
  { value: "ontspannen", label: "Ontspannen & culinair", emoji: "🍷" },
  { value: "mix", label: "Een goede mix", emoji: "⚡" },
] as const;

export const AdminAiProgramDialog = ({
  open,
  onOpenChange,
  requestId,
  numberOfPeople,
  selectedDates,
  customerDescription,
  onSuccess,
  invoicingMode,
}: AdminAiProgramDialogProps) => {
  const [vibe, setVibe] = useState<string>("mix");
  const [editableDescription, setEditableDescription] = useState(customerDescription ?? "");
  const [extraWishes, setExtraWishes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestion[] | null>(null);
  const [suggestedBlocks, setSuggestedBlocks] = useState<BlockInfo[]>([]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setSuggestions(null);

    try {
      // Fetch all published block IDs
      const { data: blocks, error: blocksError } = await supabase
        .from("building_blocks")
        .select("id")
        .eq("status", "published");

      if (blocksError) throw blocksError;

      const availableBlockIds = blocks?.map((b) => b.id) || [];
      if (availableBlockIds.length === 0) {
        toast.error("Geen gepubliceerde bouwstenen beschikbaar");
        return;
      }

      // Combine customer description with extra wishes
      const combinedWishes = [editableDescription.trim(), extraWishes.trim()]
        .filter(Boolean)
        .join("\n\nExtra wensen van admin: ");

      const { data, error } = await supabase.functions.invoke("generate-program-suggestion", {
        body: {
          occasion: "groepsuitje",
          numberOfPeople,
          dates: selectedDates,
          vibe,
          wishes: combinedWishes || undefined,
          availableBlockIds,
        },
      });

      if (error) throw error;

      const result: AiSuggestion[] = data?.suggestions || [];

      if (result.length === 0) {
        toast.error("Geen suggesties ontvangen. Probeer het opnieuw.");
        return;
      }

      // Fetch block details for preview
      const blockIds = [...new Set(result.map((s) => s.block_id))];
      const { data: blockDetails } = await supabase
        .from("building_blocks")
        .select("id, name, category, block_type, provider_id, price_adult, price_type, price_adult_note, short_description, description, duration, location_lat, location_lng, location_address, external_url")
        .in("id", blockIds);

      setSuggestions(result);
      setSuggestedBlocks((blockDetails || []) as BlockInfo[]);
    } catch (err) {
      console.error("AI generation error:", err);
      toast.error("Fout bij het genereren van het programma");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!suggestions?.length) return;
    setIsApplying(true);

    try {
      const blockMap = new Map(suggestedBlocks.map((b) => [b.id, b]));

      const rowsToInsert = suggestions
        .map((s) => {
          const block = blockMap.get(s.block_id);
          if (!block) return null;

          return {
            request_id: requestId,
            block_id: block.id,
            block_name: block.name,
            block_category: block.category,
            block_type: invoicingMode === "bureau_central" ? "bureau" : block.block_type,
            provider_id: block.provider_id || "bureau",
            provider_name: "",
            provider_email: null as string | null,
            day_index: s.day_index,
            preferred_time: s.preferred_time || null,
            status: "pending",
            item_quote_status: "concept",
            skip_partner_notification: true,
            admin_price_override: block.price_adult ?? null,
            price_type: block.price_type || "per_person",
            duration: block.duration || null,
            admin_price_notes: block.description || block.short_description || block.price_adult_note || null,
            location_lat: block.location_lat ?? null,
            location_lng: block.location_lng ?? null,
            location_address: block.location_address ?? null,
            external_url: block.external_url ?? null,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      // Enrich provider names
      const partnerIds = [...new Set(rowsToInsert.map((r) => r.provider_id).filter((id) => id !== "bureau"))];
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
          } else if (row.provider_id === "bureau") {
            row.provider_name = "Bureau Vlieland";
          }
        });
      } else {
        rowsToInsert.forEach((row) => {
          if (row.provider_id === "bureau") {
            row.provider_name = "Bureau Vlieland";
          }
        });
      }

      const { error: insertError } = await supabase
        .from("program_request_items")
        .insert(rowsToInsert as any);

      if (insertError) throw insertError;

      await logAdminActivity({
        action: "ai_program_generated",
        entityType: EntityTypes.REQUEST,
        entityId: requestId,
        details: {
          vibe,
          items_added: rowsToInsert.length,
        },
      });

      toast.success(`AI-programma toegevoegd (${rowsToInsert.length} activiteiten)`);
      onOpenChange(false);
      setSuggestions(null);
      setExtraWishes("");
      onSuccess();
    } catch (err) {
      console.error("Error applying AI suggestions:", err);
      toast.error("Fout bij toevoegen van activiteiten");
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSuggestions(null);
      setExtraWishes("");
      setEditableDescription(customerDescription ?? "");
    }
    onOpenChange(open);
  };

  const blockMap = new Map(suggestedBlocks.map((b) => [b.id, b]));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Programma genereren
          </DialogTitle>
          <DialogDescription>
            Laat AI een programma samenstellen op basis van de klantgegevens en wensen.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 max-h-[55vh]">
          <div className="space-y-5 pr-4">
            {/* Context info */}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {numberOfPeople} personen
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {selectedDates.length} {selectedDates.length === 1 ? "dag" : "dagen"}
              </span>
            </div>

            {/* Customer description - editable */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Klantomschrijving</Label>
              <Textarea
                value={editableDescription}
                onChange={(e) => setEditableDescription(e.target.value)}
                placeholder="Beschrijf het type groep, wensen, bijzonderheden..."
                rows={3}
              />
            </div>

            {/* Extra wishes */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Extra wensen / instructies</Label>
              <Textarea
                value={extraWishes}
                onChange={(e) => setExtraWishes(e.target.value)}
                placeholder="Bijv. 'Voeg een BBQ toe op dag 2' of 'Focus op teambuilding activiteiten'"
                rows={2}
              />
            </div>

            {/* Vibe picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sfeer</Label>
              <RadioGroup value={vibe} onValueChange={setVibe} className="grid grid-cols-3 gap-2">
                {vibeOptions.map((opt) => (
                  <Label
                    key={opt.value}
                    htmlFor={`admin-vibe-${opt.value}`}
                    className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-accent/50 ${
                      vibe === opt.value ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <RadioGroupItem value={opt.value} id={`admin-vibe-${opt.value}`} className="sr-only" />
                    <span>{opt.emoji}</span>
                    <span className="text-sm">{opt.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {/* Preview suggestions */}
            {suggestions && suggestions.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Voorgesteld programma ({suggestions.length} activiteiten)
                </h4>
                {Array.from(new Set(suggestions.map((s) => s.day_index)))
                  .sort()
                  .map((dayIdx) => (
                    <div key={dayIdx} className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">
                        Dag {dayIdx + 1}
                        {selectedDates[dayIdx] && (
                          <span className="ml-2 font-normal">
                            {format(new Date(selectedDates[dayIdx]), "EEEE d MMMM", { locale: nl })}
                          </span>
                        )}
                      </p>
                      {suggestions
                        .filter((s) => s.day_index === dayIdx)
                        .map((s, i) => {
                          const block = blockMap.get(s.block_id);
                          return (
                            <div
                              key={`${s.block_id}-${i}`}
                              className="flex items-center justify-between text-sm pl-3 py-1 border-l-2 border-primary/30"
                            >
                              <span>
                                {s.preferred_time && (
                                  <span className="text-muted-foreground font-mono mr-2">{s.preferred_time}</span>
                                )}
                                {block?.name || s.block_id}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {block?.category || ""}
                              </Badge>
                            </div>
                          );
                        })}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Annuleren
          </Button>
          {!suggestions ? (
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Genereren...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Genereer programma
                </>
              )}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Opnieuw genereren
              </Button>
              <Button onClick={handleApply} disabled={isApplying}>
                {isApplying ? "Toevoegen..." : `Toevoegen (${suggestions.length})`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
