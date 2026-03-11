import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePublishedBuildingBlocks } from "@/hooks/useBuildingBlocks";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { CartItemDetail } from "@/types/buildingBlock";

interface AiErwinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numberOfPeople: number;
  selectedDates: Date[];
  eventType?: string;
  onSuggestionReady: (items: CartItemDetail[]) => void;
}

const vibeOptions = [
  { value: "actief", label: "Actief & sportief", emoji: "🏄" },
  { value: "ontspannen", label: "Ontspannen & culinair", emoji: "🍷" },
  { value: "mix", label: "Een goede mix", emoji: "⚡" },
] as const;

export const AiErwinDialog = ({
  open,
  onOpenChange,
  numberOfPeople,
  selectedDates,
  eventType,
  onSuggestionReady,
}: AiErwinDialogProps) => {
  const [vibe, setVibe] = useState<string>("mix");
  const [wishes, setWishes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { data: allBlocks = [] } = usePublishedBuildingBlocks();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (allBlocks.length === 0) {
      toast({ title: "Geen activiteiten beschikbaar", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const availableBlockIds = allBlocks.map((b) => b.id);
      const dates = selectedDates.map((d) => format(d, "yyyy-MM-dd"));

      const { data, error } = await supabase.functions.invoke("generate-program-suggestion", {
        body: {
          occasion: eventType || "bedrijfsuitje",
          numberOfPeople,
          dates,
          vibe,
          wishes: wishes.trim() || undefined,
          availableBlockIds,
        },
      });

      if (error) throw error;

      const suggestions: { block_id: string; day_index: number }[] = data?.suggestions || [];

      if (suggestions.length === 0) {
        toast({
          title: "Geen suggesties ontvangen",
          description: "Probeer het opnieuw of pas uw wensen aan.",
          variant: "destructive",
        });
        return;
      }

      const cartItems: CartItemDetail[] = suggestions.map((s) => ({
        blockId: s.block_id,
        preferredTime: null,
        notes: "",
        dayIndex: s.day_index,
      }));

      onSuggestionReady(cartItems);
      onOpenChange(false);
      toast({ title: "Programma samengesteld door Erwin ✨", description: "U kunt het voorstel naar wens aanpassen." });
    } catch (err) {
      console.error("AI suggestion error:", err);
      toast({
        title: "Er ging iets mis",
        description: "Probeer het later opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Erwin stelt uw programma samen
          </SheetTitle>
          <SheetDescription>
            Kies een sfeer en eventuele wensen. Erwin selecteert de beste activiteiten voor uw groep.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 py-6">
          {/* Vibe picker */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Welke sfeer past bij uw groep?</Label>
            <RadioGroup value={vibe} onValueChange={setVibe} className="grid gap-2">
              {vibeOptions.map((opt) => (
                <Label
                  key={opt.value}
                  htmlFor={`vibe-${opt.value}`}
                  className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem value={opt.value} id={`vibe-${opt.value}`} />
                  <span className="text-lg">{opt.emoji}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Wishes */}
          <div className="space-y-2">
            <Label htmlFor="wishes" className="text-sm font-medium">
              Bijzondere wensen <span className="text-muted-foreground font-normal">(optioneel)</span>
            </Label>
            <Textarea
              id="wishes"
              value={wishes}
              onChange={(e) => setWishes(e.target.value)}
              placeholder="Bijv. 'We willen graag een BBQ op het strand' of 'Liever geen fietsen'"
              rows={3}
            />
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground space-y-1">
            <p><strong>{numberOfPeople}</strong> personen · <strong>{selectedDates.length}</strong> {selectedDates.length === 1 ? "dag" : "dagen"}</p>
            {eventType && <p>Type: {eventType}</p>}
          </div>
        </div>

        <Button
          size="lg"
          className="w-full gap-2"
          onClick={handleGenerate}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Erwin denkt na…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Stel programma samen
            </>
          )}
        </Button>
      </SheetContent>
    </Sheet>
  );
};
