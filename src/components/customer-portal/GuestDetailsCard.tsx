import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UtensilsCrossed, BedDouble, Pencil, CheckCircle2, AlertCircle } from "lucide-react";
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  emptyHint: string;
}) => {
  const filled = !!value && value.trim().length > 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{label}</span>
        {filled ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
        )}
      </div>
      {filled ? (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">{emptyHint}</p>
      )}
    </div>
  );
};

export const GuestDetailsCard = ({
  guestNames,
  dietaryNotes,
  roomAssignment,
  showDietary,
  showRoomAssignment,
  updatedAt,
  onEdit,
}: GuestDetailsCardProps) => {
  const allFilled =
    !!guestNames &&
    (!showDietary || !!dietaryNotes) &&
    (!showRoomAssignment || !!roomAssignment);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            Groep & wensen
            {allFilled ? (
              <Badge variant="secondary" className="text-xs">Compleet</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">Aanvullen</Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Bewerken
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field
          icon={<Users className="h-4 w-4" />}
          label="Gastenlijst"
          value={guestNames}
          emptyHint="Nog niet ingevuld — voeg de namen van uw gasten toe."
        />
        {showDietary && (
          <Field
            icon={<UtensilsCrossed className="h-4 w-4" />}
            label="Dieetwensen & allergieën"
            value={dietaryNotes}
            emptyHint="Vul in als er gasten zijn met een dieet of allergie. Niet ingevuld? Dan houden we hier geen rekening mee."
          />
        )}
        {showRoomAssignment && (
          <Field
            icon={<BedDouble className="h-4 w-4" />}
            label="Kamerindeling"
            value={roomAssignment}
            emptyHint="Optioneel — geef hier uw voorkeur voor de kamerverdeling door."
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
