import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ShoppingCart } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DayTabsProps {
  selectedDates: Date[];
  activeDay: number;
  onDayChange: (dayIndex: number) => void;
  itemCountPerDay: number[];
  highlightedDay?: number | null;
  children: (dayIndex: number) => ReactNode;
}

export const DayTabs = ({
  selectedDates,
  activeDay,
  onDayChange,
  itemCountPerDay,
  highlightedDay,
  children,
}: DayTabsProps) => {
  if (selectedDates.length <= 1) {
    // Single day or no days - no tabs needed
    return <>{children(0)}</>;
  }

  return (
    <Tabs
      value={String(activeDay)}
      onValueChange={(v) => onDayChange(Number(v))}
      className="w-full"
    >
      <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/50 p-1">
        {selectedDates.map((date, index) => (
          <TabsTrigger
            key={date.toISOString()}
            value={String(index)}
            className={cn(
              "flex-1 min-w-[100px] text-xs sm:text-sm gap-1.5 data-[state=active]:bg-background",
              highlightedDay === index && "animate-tab-highlight"
            )}
          >
            <span className="font-medium">Dag {index + 1}</span>
            <span className="hidden sm:inline text-muted-foreground">
              ({format(date, "d MMM", { locale: nl })})
            </span>
            {itemCountPerDay[index] > 0 && (
              <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full ml-1">
                {itemCountPerDay[index]}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      {selectedDates.map((_, index) => (
        <TabsContent key={index} value={String(index)} className="mt-3">
          {itemCountPerDay[index] === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Geen activiteiten op deze dag</p>
              <p className="text-xs mt-1">
                Voeg activiteiten toe of verplaats ze naar deze dag
              </p>
            </div>
          ) : (
            children(index)
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
};
