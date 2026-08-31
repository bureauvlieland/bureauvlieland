import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, PenLine } from "lucide-react";
import type { ProgramRequestItem } from "@/types/programRequest";

interface PendingConfirmationExplainerProps {
  items: ProgramRequestItem[];
  selectedDates: Date[];
  canAcceptUnderReservation: boolean;
  onSignUnderReservation: () => void;
}

const formatDay = (dayIndex: number | null | undefined, selectedDates: Date[]) => {
  if (dayIndex === null || dayIndex === undefined || dayIndex < 0) return null;
  const date = selectedDates[dayIndex];
  if (!date) return `Dag ${dayIndex + 1}`;
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
};

const formatTime = (time: string | null | undefined) =>
  time ? time.slice(0, 5) : null;

export const PendingConfirmationExplainer = ({
  items,
  selectedDates,
  canAcceptUnderReservation,
  onSignUnderReservation,
}: PendingConfirmationExplainerProps) => {
  if (items.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
            <Clock className="h-5 w-5 text-amber-700 dark:text-amber-300" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">
              {items.length === 1
                ? "Nog één onderdeel wacht op bevestiging van de aanbieder"
                : `Nog ${items.length} onderdelen wachten op bevestiging van de aanbieder`}
            </h3>
            <p className="text-sm text-muted-foreground">
              U heeft uw programma al goedgekeurd. Wij hebben de aanbieder(s) hieronder
              gevraagd de afspraak definitief vast te leggen. Zodra dat rond is, ziet u
              dat hier terug en ontvangt u bericht van ons.
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-background/70 p-4">
          <p className="text-sm font-medium mb-2">Deze onderdelen zijn nog niet bevestigd:</p>
          <ul className="space-y-2">
            {items.map((item) => {
              const day = formatDay(item.day_index, selectedDates);
              const time = formatTime(item.preferred_time);
              return (
                <li key={item.id} className="text-sm flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{item.block_name}</span>
                  {item.provider_name && (
                    <span className="text-muted-foreground">· {item.provider_name}</span>
                  )}
                  {(day || time) && (
                    <span className="text-muted-foreground">
                      · {[day, time].filter(Boolean).join(", ")}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {canAcceptUnderReservation && (
          <div className="rounded-lg border border-amber-300 bg-white/70 dark:border-amber-800 dark:bg-background/60 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium">Wilt u nu al ondertekenen?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Dat kan onder voorbehoud. U legt uw programma en de voorwaarden dan nu
                vast; de onderdelen hierboven blijven onder voorbehoud van bevestiging
                door de aanbieder. Lukt een onderdeel niet, dan zoeken wij een alternatief
                of laten wij het vervallen — u betaalt daar dan niets voor.
              </p>
            </div>
            <Button variant="outline" onClick={onSignUnderReservation}>
              <PenLine className="h-4 w-4 mr-2" />
              Toch nu ondertekenen (onder voorbehoud)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
