import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, CalendarIcon, ShoppingCart, ArrowRight, Building2, Users2, Info } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getBlockById, calculateBureauFee, groupBlocksByType, type BuildingBlock } from "@/data/configuratorMockData";

interface ConfiguratorCartProps {
  cartItems: string[];
  numberOfPeople: number;
  selectedDate: Date | undefined;
  onRemoveItem: (blockId: string) => void;
  onPeopleChange: (count: number) => void;
  onDateChange: (date: Date | undefined) => void;
  onSubmit: () => void;
}

export const ConfiguratorCart = ({
  cartItems,
  numberOfPeople,
  selectedDate,
  onRemoveItem,
  onPeopleChange,
  onDateChange,
  onSubmit,
}: ConfiguratorCartProps) => {
  const blocks = cartItems.map((id) => getBlockById(id)).filter(Boolean) as BuildingBlock[];
  const bureauFee = calculateBureauFee(numberOfPeople);
  const groupedBlocks = groupBlocksByType(blocks);

  // Calculate indicative total - exclude self_arranged items
  const calculateTotal = () => {
    let total = 0;
    blocks.forEach((block) => {
      // Skip self_arranged items in price calculation
      if (block.blockType === "self_arranged") return;
      
      // Extract number from price indication (e.g., "€ 35" -> 35)
      const priceMatch = block.priceIndication.match(/\d+/);
      if (priceMatch) {
        const price = parseInt(priceMatch[0], 10);
        // If price is per person, multiply
        if (block.priceNote?.includes("p.p.")) {
          total += price * numberOfPeople;
        } else {
          total += price;
        }
      }
    });
    return total;
  };

  const indicativeTotal = calculateTotal();

  // Check if there are any billable items (excluding self_arranged)
  const hasBillableItems = groupedBlocks.bureau.length > 0 || groupedBlocks.partner.length > 0;

  if (cartItems.length === 0) {
    return (
      <Card className="p-6 bg-muted/30 border-dashed">
        <div className="text-center text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Je programma is nog leeg</p>
          <p className="text-sm mt-1">Voeg bouwstenen toe om te beginnen</p>
        </div>
      </Card>
    );
  }

  const renderBlockItem = (block: BuildingBlock) => (
    <div
      key={block.id}
      className="flex items-center justify-between py-2 px-3 bg-background rounded-lg"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{block.name}</p>
        <p className="text-xs text-muted-foreground">
          {block.priceIndication} {block.priceNote}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => onRemoveItem(block.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <ShoppingCart className="h-5 w-5" />
        Jouw Programma
        <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full ml-auto">
          {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
        </span>
      </h3>

      {/* Grouped items */}
      <div className="space-y-4 mb-6">
        {/* Bureau Vlieland items */}
        {groupedBlocks.bureau.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Building2 className="h-4 w-4 text-primary" />
              <span>Gefactureerd door Bureau Vlieland</span>
            </div>
            <div className="space-y-1 ml-6 bg-muted/50 rounded-lg p-2">
              {groupedBlocks.bureau.map(renderBlockItem)}
            </div>
          </div>
        )}

        {/* Partner items */}
        {groupedBlocks.partner.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Users2 className="h-4 w-4 text-primary" />
              <span>Gefactureerd door aanbieders</span>
            </div>
            <div className="space-y-1 ml-6 bg-muted/50 rounded-lg p-2">
              {groupedBlocks.partner.map(renderBlockItem)}
            </div>
          </div>
        )}

        {/* Self-arranged items */}
        {groupedBlocks.self_arranged.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
              <Info className="h-4 w-4" />
              <span>Zelf te regelen</span>
            </div>
            <div className="space-y-1 ml-6 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2">
              {groupedBlocks.self_arranged.map(renderBlockItem)}
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Links ontvang je na het versturen van je aanvraag
            </p>
          </div>
        )}

        {/* Bureau fee - always shown when there are billable items */}
        {hasBillableItems && (
          <div className="flex items-center justify-between py-2 px-3 bg-primary/10 rounded-lg ml-6">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Handling fee</p>
              <p className="text-xs text-muted-foreground">Bureau Vlieland coördinatie</p>
            </div>
            <span className="text-sm font-medium">€ {bureauFee}</span>
          </div>
        )}
      </div>

      {/* People and date inputs */}
      <div className="space-y-4 mb-6">
        <div>
          <Label htmlFor="numberOfPeople" className="text-sm">
            Aantal personen
          </Label>
          <Input
            id="numberOfPeople"
            type="number"
            min={1}
            max={500}
            value={numberOfPeople}
            onChange={(e) => onPeopleChange(parseInt(e.target.value, 10) || 1)}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-sm">Gewenste datum</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal mt-1",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate
                  ? format(selectedDate, "d MMMM yyyy", { locale: nl })
                  : "Selecteer datum"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onDateChange}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Pricing summary */}
      {hasBillableItems && (
        <div className="border-t pt-4 space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Indicatief subtotaal</span>
            <span>€ {indicativeTotal.toLocaleString("nl-NL")}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Bureau fee ({numberOfPeople} pers.)</span>
            <span>€ {bureauFee}</span>
          </div>
          <div className="flex justify-between font-semibold text-foreground pt-2 border-t">
            <span>Indicatief totaal</span>
            <span>€ {(indicativeTotal + bureauFee).toLocaleString("nl-NL")}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            * Prijzen zijn indicatief. Exacte prijzen na overleg met aanbieders.
          </p>
        </div>
      )}

      {/* Self-arranged only message */}
      {!hasBillableItems && groupedBlocks.self_arranged.length > 0 && (
        <div className="border-t pt-4 text-sm text-muted-foreground">
          <p>Je hebt alleen "zelf te regelen" items geselecteerd. Voeg activiteiten of catering toe voor een complete aanvraag.</p>
        </div>
      )}

      {/* Submit button */}
      <Button
        onClick={onSubmit}
        className="w-full mt-6"
        size="lg"
        disabled={!selectedDate || numberOfPeople < 1 || !hasBillableItems}
      >
        Aanvraag versturen
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </Card>
  );
};
