import { Users, UtensilsCrossed, BedDouble, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

interface GuestDetailsDisplayProps {
  guestNames: string | null;
  dietaryNotes: string | null;
  roomAssignment: string | null;
  showDietary?: boolean;
  showRoomAssignment?: boolean;
  updatedAt?: string | null;
  onEdit?: () => void;
  compact?: boolean;
  emptyLabel?: string;
}

const Row = ({
  icon,
  label,
  value,
  emptyLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  emptyLabel: string;
}) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
      {icon}
      {label}
    </div>
    {value && value.trim() ? (
      <p className="text-sm whitespace-pre-wrap">{value}</p>
    ) : (
      <p className="text-sm italic text-muted-foreground">{emptyLabel}</p>
    )}
  </div>
);

export const GuestDetailsDisplay = ({
  guestNames,
  dietaryNotes,
  roomAssignment,
  showDietary = true,
  showRoomAssignment = false,
  updatedAt,
  onEdit,
  emptyLabel = "Niet ingevuld",
}: GuestDetailsDisplayProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Groep & wensen
        </h3>
        {onEdit && (
          <Button variant="ghost" size="sm" className="h-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Bewerken
          </Button>
        )}
      </div>
      <Row icon={<Users className="h-3.5 w-3.5" />} label="Gastenlijst" value={guestNames} emptyLabel={emptyLabel} />
      {showDietary && (
        <Row
          icon={<UtensilsCrossed className="h-3.5 w-3.5" />}
          label="Dieetwensen & allergieën"
          value={dietaryNotes}
          emptyLabel={emptyLabel}
        />
      )}
      {showRoomAssignment && (
        <Row
          icon={<BedDouble className="h-3.5 w-3.5" />}
          label="Kamerindeling"
          value={roomAssignment}
          emptyLabel={emptyLabel}
        />
      )}
      {updatedAt && (
        <p className="text-xs text-muted-foreground">
          Door klant bijgewerkt op {format(parseISO(updatedAt), "d MMM yyyy 'om' HH:mm", { locale: nl })}
        </p>
      )}
    </div>
  );
};
