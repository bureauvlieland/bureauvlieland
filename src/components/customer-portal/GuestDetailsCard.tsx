import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/system";
import { Users, UtensilsCrossed, BedDouble, Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

interface GuestDetailsCardProps {
  guestNames: string | null;
  dietaryNotes: string | null;
  roomAssignment: string | null;
  showDietary: boolean;
  showRoomAssignment: boolean;
  updatedAt: string | null;
  onEdit: () => void;
}

const Field = ({
  icon,
  label,
  value,
  emptyHint,
  optional,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  emptyHint: string;
  optional?: boolean;
}) => {
  const filled = !!value && value.trim().length > 0;
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
        <span className="text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        <span>{label}</span>
        {!filled && !optional && (
          <Pill tone="warning" size="sm">
            Aanvullen
          </Pill>
        )}
      </div>
      {filled ? (
        <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
      )}
    </div>
  );
};

/** Groep en wensen op Praktisch (klantportaal fase 3b): één kaart, één status, één knop. */
export const GuestDetailsCard = ({
  guestNames,
  dietaryNotes,
  roomAssignment,
  showDietary,
  showRoomAssignment,
  updatedAt,
  onEdit,
}: GuestDetailsCardProps) => {
  const allFilled = !!guestNames && (!showDietary || !!dietaryNotes);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            Groep en wensen
            <Pill tone={allFilled ? "success" : "warning"}>{allFilled ? "Compleet" : "Aanvullen"}</Pill>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Bewerken
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field icon={<Users aria-hidden="true" />} label="Gastenlijst" value={guestNames} emptyHint="Nog niet ingevuld. Voeg de namen van uw gasten toe." />
        {showDietary && (
          <Field
            icon={<UtensilsCrossed aria-hidden="true" />}
            label="Dieetwensen en allergieën"
            value={dietaryNotes}
            emptyHint="Vul in als er gasten zijn met een dieet of allergie. Niet ingevuld betekent: geen bijzonderheden."
          />
        )}
        {showRoomAssignment && (
          <Field
            icon={<BedDouble aria-hidden="true" />}
            label="Kamerindeling"
            value={roomAssignment}
            emptyHint="Optioneel. Geef hier uw voorkeur voor de kamerverdeling door."
            optional
          />
        )}
        {updatedAt && (
          <p className="text-xs text-muted-foreground">
            Laatst bijgewerkt op {format(parseISO(updatedAt), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
