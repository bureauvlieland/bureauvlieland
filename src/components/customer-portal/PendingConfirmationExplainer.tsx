import { Button } from "@/components/ui/button";
import { PenLine } from "lucide-react";
import { Notice } from "@/components/system";
import type { ProgramRequestItem } from "@/types/programRequest";

interface PendingConfirmationExplainerProps {
  items: ProgramRequestItem[];
  selectedDates: Date[];
  canAcceptUnderReservation: boolean;
  /** Heeft de klant het voorstel al goedgekeurd? */
  customerApproved?: boolean;
  onSignUnderReservation: () => void;
}

const formatDay = (dayIndex: number | null | undefined, selectedDates: Date[]) => {
  if (dayIndex === null || dayIndex === undefined || dayIndex < 0) return null;
  const date = selectedDates[dayIndex];
  if (!date) return `dag ${dayIndex + 1}`;
  return date.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "long" });
};

const formatTime = (time: string | null | undefined) => (time ? time.slice(0, 5) : null);

/**
 * Welke onderdelen nog op de aanbieder wachten, en of de klant nu al onder
 * voorbehoud mag ondertekenen (klantportaal fase 3a). Eén melding: `info`
 * als de aanbieder aan zet is, `warning` als de klant eerst zelf moet
 * goedkeuren.
 */
export const PendingConfirmationExplainer = ({
  items,
  selectedDates,
  canAcceptUnderReservation,
  customerApproved = false,
  onSignUnderReservation,
}: PendingConfirmationExplainerProps) => {
  if (items.length === 0) return null;

  const title =
    items.length === 1
      ? "Eén onderdeel wacht nog op de aanbieder"
      : `${items.length} onderdelen wachten nog op de aanbieder`;

  return (
    <Notice tone={customerApproved ? "info" : "warning"} title={title}>
      <p>
        {customerApproved
          ? "U heeft uw programma goedgekeurd. Wij hebben de aanbieders gevraagd de afspraak vast te leggen; zodra dat rond is, ziet u het hier en krijgt u bericht."
          : "Geef eerst uw akkoord op het voorstel in uw programma. Daarna kunt u hier de voorwaarden ondertekenen."}
      </p>
      <ul className="mt-2 space-y-1">
        {items.map((item) => {
          const when = [formatDay(item.day_index, selectedDates), formatTime(item.preferred_time)].filter(Boolean).join(", ");
          return (
            <li key={item.id}>
              <span className="font-medium">{item.block_name}</span>
              {item.provider_name && <span> · {item.provider_name}</span>}
              {when && <span> · {when}</span>}
            </li>
          );
        })}
      </ul>
      {canAcceptUnderReservation && (
        <div className="mt-3 space-y-2">
          <p>
            U kunt nu al ondertekenen, onder voorbehoud. De onderdelen hierboven blijven dan wachten op de aanbieder.
            Lukt er een niet, dan zoeken wij een alternatief of vervalt het zonder kosten.
          </p>
          <Button variant="outline" size="sm" onClick={onSignUnderReservation}>
            <PenLine className="mr-2 h-4 w-4" aria-hidden="true" />
            Nu ondertekenen onder voorbehoud
          </Button>
        </div>
      )}
    </Notice>
  );
};
