import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Loader2, Sparkles, Users, Calendar as CalendarIcon, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import erwinProfile from "@/assets/erwin-profile.jpg";
import type { BuildingBlock, CartItemDetail } from "@/types/buildingBlock";

interface AiErwinChatProps {
  allBlocks: BuildingBlock[];
  onSuggestionReady: (items: CartItemDetail[], dates: Date[], numberOfPeople: number) => void;
  onBack: () => void;
}

type Occasion = "bedrijfsuitje" | "teamuitje" | "heisessie" | "incentive" | "bruiloft" | "familieweekend" | "groepsweekend" | "jubileum";
type Vibe = "actief" | "ontspannen" | "mix";

const OCCASION_OPTIONS: { id: Occasion; label: string; emoji: string }[] = [
  { id: "bedrijfsuitje", label: "Bedrijfsuitje", emoji: "💼" },
  { id: "teamuitje", label: "Teamuitje", emoji: "🤝" },
  { id: "heisessie", label: "Heisessie / MT-dag", emoji: "🧠" },
  { id: "incentive", label: "Incentive reis", emoji: "🏆" },
  { id: "bruiloft", label: "Bruiloft", emoji: "💒" },
  { id: "familieweekend", label: "Familieweekend", emoji: "👨‍👩‍👧‍👦" },
  { id: "groepsweekend", label: "Groepsweekend", emoji: "🎉" },
  { id: "jubileum", label: "Jubileum", emoji: "🥂" },
];

const VIBE_OPTIONS: { id: Vibe; label: string; desc: string; emoji: string }[] = [
  { id: "actief", label: "Actief & avontuurlijk", desc: "Sport, outdoor, actie", emoji: "🏄" },
  { id: "ontspannen", label: "Ontspannen & genieten", desc: "Natuur, culinair, wellness", emoji: "🌅" },
  { id: "mix", label: "Goede mix", desc: "Een beetje van alles", emoji: "⚡" },
];

export const AiErwinChat = ({ allBlocks, onSuggestionReady, onBack }: AiErwinChatProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [numberOfPeople, setNumberOfPeople] = useState(20);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [wishes, setWishes] = useState("");

  const minDate = addDays(new Date(), 7);

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (dates) {
      setSelectedDates(dates.slice(0, 7).sort((a, b) => a.getTime() - b.getTime()));
    }
  };

  const canProceedStep1 = occasion !== null;
  const canProceedStep2 = numberOfPeople >= 8 && selectedDates.length > 0;
  const canProceedStep3 = vibe !== null;

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-program-suggestion", {
        body: {
          occasion,
          numberOfPeople,
          dates: selectedDates.map(d => d.toISOString().split("T")[0]),
          vibe,
          wishes,
          availableBlockIds: allBlocks.map(b => b.id),
        },
      });

      if (error) throw error;

      const suggestions: { block_id: string; day_index: number }[] = data?.suggestions || [];

      if (suggestions.length === 0) {
        toast({
          title: "Geen suggesties",
          description: "Erwin kon geen passend programma samenstellen. Probeer het met andere voorkeuren.",
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }

      // Convert to CartItemDetail format
      const cartItems: CartItemDetail[] = suggestions
        .filter(s => allBlocks.some(b => b.id === s.block_id))
        .map(s => ({
          blockId: s.block_id,
          preferredTime: null,
          notes: "",
          dayIndex: s.day_index,
        }));

      onSuggestionReady(cartItems, selectedDates, numberOfPeople);

      toast({
        title: "Programma samengesteld!",
        description: `Erwin heeft ${cartItems.length} activiteiten voor u geselecteerd.`,
      });
    } catch (error: any) {
      console.error("AI suggestion error:", error);
      
      // Handle rate limit / payment errors
      if (error?.status === 429) {
        toast({
          title: "Even geduld",
          description: "Er zijn te veel verzoeken. Probeer het over een minuut opnieuw.",
          variant: "destructive",
        });
      } else if (error?.status === 402) {
        toast({
          title: "Service tijdelijk niet beschikbaar",
          description: "Probeer het later opnieuw of kies zelf uw onderdelen.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Er ging iets mis",
          description: "Probeer het opnieuw of kies zelf uw onderdelen.",
          variant: "destructive",
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const ErwinBubble = ({ children }: { children: React.ReactNode }) => (
    <div className="flex gap-3 mb-6">
      <img src={erwinProfile} alt="Erwin" className="w-10 h-10 rounded-full object-cover shrink-0 mt-1" />
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-foreground max-w-md">
        {children}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Step 1: Occasion */}
      {step === 1 && (
        <>
          <ErwinBubble>
            <p className="font-medium mb-1">Hoi! Ik ben Erwin 👋</p>
            <p>Ik help u graag bij het samenstellen van een programma op Vlieland. Wat voor gelegenheid is het?</p>
          </ErwinBubble>

          <div className="grid grid-cols-2 gap-2 mb-6 ml-13">
            {OCCASION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setOccasion(opt.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                  occasion === opt.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card border border-border hover:border-primary/50 text-foreground"
                )}
              >
                <span>{opt.emoji}</span>
                <span>{opt.label}</span>
                {occasion === opt.id && <Check className="h-4 w-4 ml-auto" />}
              </button>
            ))}
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={onBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Terug
            </Button>
            <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="gap-2">
              Volgende <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Step 2: People + Dates */}
      {step === 2 && (
        <>
          <ErwinBubble>
            <p>Top! Met hoeveel personen komen jullie en wanneer?</p>
          </ErwinBubble>

          <div className="space-y-4 mb-6 ml-13">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Aantal personen
                </Label>
                <Input
                  type="number"
                  min={8}
                  max={200}
                  value={numberOfPeople}
                  onChange={(e) => setNumberOfPeople(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-28 text-center text-lg"
                />
                {numberOfPeople < 8 && <p className="text-xs text-destructive">Minimaal 8 personen</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  Datum(s)
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        selectedDates.length === 0 && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDates.length === 0
                        ? "Kies datum(s)"
                        : selectedDates.length === 1
                          ? format(selectedDates[0], "d MMMM yyyy", { locale: nl })
                          : `${selectedDates.length} dagen`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="multiple"
                      selected={selectedDates}
                      onSelect={handleDateSelect}
                      disabled={(date) => date < minDate}
                      initialFocus
                      locale={nl}
                    />
                  </PopoverContent>
                </Popover>
                {selectedDates.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedDates.map((d, i) => (
                      <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {format(d, "d MMM", { locale: nl })}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Terug
            </Button>
            <Button onClick={() => setStep(3)} disabled={!canProceedStep2} className="gap-2">
              Volgende <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Step 3: Vibe + Wishes */}
      {step === 3 && (
        <>
          <ErwinBubble>
            <p>Wat voor sfeer zoeken jullie? En heb je nog speciale wensen?</p>
          </ErwinBubble>

          <div className="space-y-4 mb-6 ml-13">
            <div className="grid gap-2">
              {VIBE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setVibe(opt.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all text-left",
                    vibe === opt.id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-card border border-border hover:border-primary/50 text-foreground"
                  )}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <div className="flex-1">
                    <span className="font-medium">{opt.label}</span>
                    <span className={cn("text-xs block mt-0.5", vibe === opt.id ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {opt.desc}
                    </span>
                  </div>
                  {vibe === opt.id && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Bijzondere wensen (optioneel)</Label>
              <Textarea
                value={wishes}
                onChange={(e) => setWishes(e.target.value)}
                placeholder="Bijv. vegetarisch eten, rolstoeltoegankelijk, verrassing voor de jarige..."
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Terug
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!canProceedStep3 || isGenerating}
              size="lg"
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Erwin denkt na...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Stel programma samen
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
